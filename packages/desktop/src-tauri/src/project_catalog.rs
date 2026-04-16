use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const REGISTRY_FILE_NAME: &str = "projects.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectSource {
    Opened,
    Discovered,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRecord {
    pub project_path: String,
    pub name: String,
    pub last_opened_at: Option<String>,
    pub source: ProjectSource,
    pub is_available: bool,
}

impl ProjectRecord {
    pub fn discovered(project_path: impl AsRef<str>) -> Self {
        let project_path = project_path.as_ref().to_string();
        Self {
            name: basename_or_path(&project_path),
            is_available: is_valid_project_dir(Path::new(&project_path)),
            project_path,
            last_opened_at: None,
            source: ProjectSource::Discovered,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectRegistryFile {
    pub projects: Vec<ProjectRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UpsertProjectInput {
    pub project_path: String,
    pub name: Option<String>,
    pub source: ProjectSource,
    pub last_opened_at: Option<String>,
}

impl UpsertProjectInput {
    pub fn discovered(project_path: impl AsRef<str>, name: Option<String>) -> Self {
        Self {
            project_path: project_path.as_ref().to_string(),
            name,
            source: ProjectSource::Discovered,
            last_opened_at: None,
        }
    }

    pub fn opened(
        project_path: impl AsRef<str>,
        name: Option<String>,
        last_opened_at: Option<String>,
    ) -> Self {
        Self {
            project_path: project_path.as_ref().to_string(),
            name,
            source: ProjectSource::Opened,
            last_opened_at,
        }
    }
}

fn now_timestamp() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|err| format!("failed to format RFC3339 timestamp: {err}"))
}

pub fn resolve_registry_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|err| format!("failed to resolve app data dir: {err}"))?;
    Ok(app_data_dir.join(REGISTRY_FILE_NAME))
}

pub fn load_registry_or_empty(path: &Path) -> io::Result<ProjectRegistryFile> {
    if !path.exists() {
        return Ok(ProjectRegistryFile::default());
    }

    let content = fs::read_to_string(path)?;
    let parsed = serde_json::from_str::<ProjectRegistryFile>(&content)
        .map_err(|err| io::Error::new(io::ErrorKind::InvalidData, err))?;
    Ok(parsed)
}

pub fn save_registry(path: &Path, registry: &ProjectRegistryFile) -> io::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let content = serde_json::to_string_pretty(registry)
        .map_err(|err| io::Error::new(io::ErrorKind::Other, err))?;
    fs::write(path, content)
}

pub fn load_projects_for_ui(path: &Path) -> io::Result<Vec<ProjectRecord>> {
    let registry = load_registry_or_empty(path)?;
    Ok(registry.projects)
}

pub fn upsert_opened_project(
    path: &Path,
    project_path: String,
    name: Option<String>,
    last_opened_at: String,
) -> io::Result<ProjectRecord> {
    let mut registry = load_registry_or_empty(path)?;
    registry.projects = upsert_project(
        registry.projects,
        UpsertProjectInput::opened(project_path.clone(), name, Some(last_opened_at)),
    );

    save_registry(path, &registry)?;

    registry
        .projects
        .into_iter()
        .find(|record| record.project_path == project_path)
        .ok_or_else(|| io::Error::new(io::ErrorKind::Other, "upserted project not found"))
}

#[tauri::command]
pub fn catalog_list_projects(app_handle: AppHandle) -> Result<Vec<ProjectRecord>, String> {
    let registry_path = resolve_registry_path(&app_handle)?;
    load_projects_for_ui(&registry_path).map_err(|err| format!("failed to load catalog: {err}"))
}

#[tauri::command]
pub fn catalog_upsert_opened_project(
    app_handle: AppHandle,
    project_path: String,
    name: Option<String>,
) -> Result<ProjectRecord, String> {
    let registry_path = resolve_registry_path(&app_handle)?;
    let timestamp = now_timestamp()?;

    upsert_opened_project(&registry_path, project_path, name, timestamp)
        .map_err(|err| format!("failed to upsert opened project: {err}"))
}

#[tauri::command]
pub fn catalog_validate_project_path(project_path: String) -> bool {
    is_valid_project_dir(Path::new(&project_path))
}

pub fn upsert_project(
    mut existing: Vec<ProjectRecord>,
    input: UpsertProjectInput,
) -> Vec<ProjectRecord> {
    let project_path = input.project_path;
    let explicit_name = normalize_name(input.name);
    let basename = basename_or_path(&project_path);
    let is_available = is_valid_project_dir(Path::new(&project_path));

    if let Some(record) = existing
        .iter_mut()
        .find(|record| record.project_path == project_path)
    {
        record.source = merge_source(record.source, input.source);
        record.is_available = is_available;

        record.name = explicit_name
            .clone()
            .or_else(|| normalize_name(Some(record.name.clone())))
            .unwrap_or_else(|| basename.clone());

        if input.source == ProjectSource::Opened {
            if let Some(last_opened_at) = input.last_opened_at {
                record.last_opened_at = Some(last_opened_at);
            }
        }

        return existing;
    }

    let name = explicit_name.unwrap_or(basename);
    existing.push(ProjectRecord {
        project_path,
        name,
        last_opened_at: if input.source == ProjectSource::Opened {
            input.last_opened_at
        } else {
            None
        },
        source: input.source,
        is_available,
    });

    existing
}

pub fn is_valid_project_dir(project_path: &Path) -> bool {
    if !project_path.exists() || !project_path.is_dir() {
        return false;
    }

    project_path.join(".tasks").is_dir() || project_path.join("opencode.json").is_file()
}

fn merge_source(existing: ProjectSource, incoming: ProjectSource) -> ProjectSource {
    if existing == ProjectSource::Opened || incoming == ProjectSource::Opened {
        ProjectSource::Opened
    } else {
        ProjectSource::Discovered
    }
}

fn basename_or_path(project_path: &str) -> String {
    Path::new(project_path)
        .file_name()
        .and_then(|name| name.to_str())
        .map(|name| name.to_string())
        .unwrap_or_else(|| project_path.to_string())
}

fn normalize_name(name: Option<String>) -> Option<String> {
    name.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use time::format_description::well_known::Rfc3339;
    use time::OffsetDateTime;

    use super::*;

    fn unique_temp_dir(prefix: &str) -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "{}-{}",
            prefix,
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time before unix epoch")
                .as_nanos()
        ));
        fs::create_dir_all(&path).expect("temp dir must be created");
        path
    }

    #[test]
    fn empty_registry_default() {
        let registry = ProjectRegistryFile::default();
        assert!(registry.projects.is_empty());
    }

    #[test]
    fn opened_outranks_discovered() {
        let existing = vec![ProjectRecord::discovered("/tmp/openkanban-project")];
        let next = upsert_project(
            existing,
            UpsertProjectInput::opened(
                "/tmp/openkanban-project",
                None,
                Some("2026-04-13T20:00:00.000Z".into()),
            ),
        );

        assert_eq!(next.len(), 1);
        assert_eq!(next[0].source, ProjectSource::Opened);
    }

    #[test]
    fn now_timestamp_returns_rfc3339_string() {
        let timestamp = now_timestamp().expect("timestamp must be generated");
        let parsed =
            OffsetDateTime::parse(&timestamp, &Rfc3339).expect("timestamp must be valid RFC3339");

        assert_eq!(parsed.offset(), time::UtcOffset::UTC);
    }

    #[test]
    fn merge_source_preserves_opened_in_all_combinations() {
        assert_eq!(
            merge_source(ProjectSource::Discovered, ProjectSource::Discovered),
            ProjectSource::Discovered
        );
        assert_eq!(
            merge_source(ProjectSource::Discovered, ProjectSource::Opened),
            ProjectSource::Opened
        );
        assert_eq!(
            merge_source(ProjectSource::Opened, ProjectSource::Discovered),
            ProjectSource::Opened
        );
        assert_eq!(
            merge_source(ProjectSource::Opened, ProjectSource::Opened),
            ProjectSource::Opened
        );
    }

    #[test]
    fn upsert_discovered_does_not_downgrade_opened_source() {
        let project_path = "/tmp/openkanban-project";
        let existing = vec![ProjectRecord {
            project_path: project_path.into(),
            name: "openkanban-project".into(),
            last_opened_at: Some("2026-04-12T20:00:00.000Z".into()),
            source: ProjectSource::Opened,
            is_available: false,
        }];

        let merged = upsert_project(
            existing,
            UpsertProjectInput::discovered(project_path, Some("New Name".into())),
        );

        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].source, ProjectSource::Opened);
    }

    #[test]
    fn last_opened_at_updates_only_on_opened_upsert() {
        let existing = vec![ProjectRecord {
            project_path: "/tmp/openkanban-project".into(),
            name: "openkanban-project".into(),
            last_opened_at: Some("2026-04-12T20:00:00.000Z".into()),
            source: ProjectSource::Opened,
            is_available: false,
        }];

        let discovered = upsert_project(
            existing.clone(),
            UpsertProjectInput::discovered("/tmp/openkanban-project", Some("ignored".into())),
        );
        assert_eq!(
            discovered[0].last_opened_at.as_deref(),
            Some("2026-04-12T20:00:00.000Z")
        );

        let opened = upsert_project(
            existing,
            UpsertProjectInput::opened(
                "/tmp/openkanban-project",
                None,
                Some("2026-04-13T20:00:00.000Z".into()),
            ),
        );
        assert_eq!(
            opened[0].last_opened_at.as_deref(),
            Some("2026-04-13T20:00:00.000Z")
        );
    }

    #[test]
    fn basename_fallback_for_name() {
        let next = upsert_project(
            Vec::new(),
            UpsertProjectInput::discovered("/tmp/my-awesome-board", None),
        );

        assert_eq!(next.len(), 1);
        assert_eq!(next[0].name, "my-awesome-board");
    }

    #[test]
    fn missing_file_is_implicit_empty_registry() {
        let temp = std::env::temp_dir().join(format!(
            "openkanban-missing-registry-{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .expect("system time before unix epoch")
                .as_nanos()
        ));

        fs::create_dir_all(&temp).expect("temp dir must be created");
        let missing_file = temp.join("projects.json");
        assert!(!missing_file.exists());

        let registry = load_registry_or_empty(&missing_file).expect("load must succeed");
        assert!(registry.projects.is_empty());

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }

    #[test]
    fn directory_without_tasks_and_opencode_json_is_not_valid() {
        let temp = unique_temp_dir("openkanban-invalid-project");

        assert!(!is_valid_project_dir(&temp));

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }

    #[test]
    fn load_projects_for_ui_returns_empty_when_registry_is_missing() {
        let temp = unique_temp_dir("openkanban-load-empty");
        let registry_path = temp.join("projects.json");

        let projects = load_projects_for_ui(&registry_path).expect("load must succeed");
        assert!(projects.is_empty());

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }

    #[test]
    fn load_projects_for_ui_reads_projects_from_registry_file() {
        let temp = unique_temp_dir("openkanban-load-existing");
        let registry_path = temp.join("projects.json");

        let registry = ProjectRegistryFile {
            projects: vec![ProjectRecord {
                project_path: "/tmp/project-alpha".into(),
                name: "project-alpha".into(),
                last_opened_at: Some("2026-04-13T20:30:00.000Z".into()),
                source: ProjectSource::Opened,
                is_available: true,
            }],
        };
        save_registry(&registry_path, &registry).expect("registry write must succeed");

        let projects = load_projects_for_ui(&registry_path).expect("load must succeed");
        assert_eq!(projects, registry.projects);

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }

    #[test]
    fn upsert_opened_project_writes_new_record_with_opened_source() {
        let temp = unique_temp_dir("openkanban-upsert-opened");
        let registry_path = temp.join("projects.json");
        let project_dir = temp.join("workspace-a");
        fs::create_dir_all(project_dir.join(".tasks")).expect("project marker must be created");

        let inserted = upsert_opened_project(
            &registry_path,
            project_dir.to_string_lossy().to_string(),
            Some("Workspace A".into()),
            "2026-04-13T20:40:00.000Z".into(),
        )
        .expect("upsert must succeed");

        assert_eq!(inserted.source, ProjectSource::Opened);
        assert_eq!(inserted.name, "Workspace A");
        assert_eq!(
            inserted.last_opened_at.as_deref(),
            Some("2026-04-13T20:40:00.000Z")
        );
        assert!(inserted.is_available);

        let projects = load_projects_for_ui(&registry_path).expect("load must succeed");
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0], inserted);

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }

    #[test]
    fn upsert_opened_project_sets_is_available_false_for_invalid_directory() {
        let temp = unique_temp_dir("openkanban-upsert-invalid");
        let registry_path = temp.join("projects.json");
        let invalid_project_dir = temp.join("workspace-b");
        fs::create_dir_all(&invalid_project_dir).expect("project dir must be created");

        let inserted = upsert_opened_project(
            &registry_path,
            invalid_project_dir.to_string_lossy().to_string(),
            None,
            "2026-04-13T20:41:00.000Z".into(),
        )
        .expect("upsert must succeed");

        assert!(!inserted.is_available);
        assert_eq!(inserted.source, ProjectSource::Opened);

        fs::remove_dir_all(temp).expect("temp dir must be removed");
    }
}
