// tests/script_executor_test.rs — CDP 脚本执行器单元测试

use beehive_browser_lib::{ScriptStep, StepResult};

// ── 1. ScriptStep JSON 反序列化测试 ─────────────────────────

#[test]
fn test_script_step_deserialize_navigate() {
    let json = r#"{"action":"navigate","target":"https://x.com/home","wait_ms":3000}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "navigate");
    assert_eq!(step.target, Some("https://x.com/home".to_string()));
    assert_eq!(step.wait_ms, Some(3000));
    assert_eq!(step.humanize, None);
    assert_eq!(step.optional, None);
}

#[test]
fn test_script_step_deserialize_click() {
    let json = r#"{"action":"click","target":"div[data-testid=like]","wait_ms":1000,"humanize":true}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "click");
    assert_eq!(step.target, Some("div[data-testid=like]".to_string()));
    assert_eq!(step.wait_ms, Some(1000));
    assert_eq!(step.humanize, Some(true));
}

#[test]
fn test_script_step_deserialize_type() {
    let json = r#"{"action":"type","target":"input[name=text]","value":"Hello","wait_ms":500}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "type");
    assert_eq!(step.target, Some("input[name=text]".to_string()));
    assert_eq!(step.value, Some("Hello".to_string()));
    assert_eq!(step.wait_ms, Some(500));
}

#[test]
fn test_script_step_deserialize_scroll() {
    let json = r#"{"action":"scroll","value":"down","wait_ms":2000}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "scroll");
    assert_eq!(step.value, Some("down".to_string()));
    assert_eq!(step.wait_ms, Some(2000));
}

#[test]
fn test_script_step_deserialize_wait() {
    let json = r#"{"action":"wait","value":"3000"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "wait");
    assert_eq!(step.value, Some("3000".to_string()));
}

#[test]
fn test_script_step_deserialize_screenshot() {
    let json = r#"{"action":"screenshot","value":"/tmp/shot.png"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "screenshot");
    assert_eq!(step.value, Some("/tmp/shot.png".to_string()));
}

#[test]
fn test_script_step_deserialize_evaluate() {
    let json = r#"{"action":"evaluate","value":"document.title"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "evaluate");
    assert_eq!(step.value, Some("document.title".to_string()));
}

#[test]
fn test_script_step_deserialize_select() {
    let json = r#"{"action":"select","target":"select#country","value":"CN","optional":true}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "select");
    assert_eq!(step.target, Some("select#country".to_string()));
    assert_eq!(step.value, Some("CN".to_string()));
    assert_eq!(step.optional, Some(true));
}

#[test]
fn test_script_step_deserialize_full() {
    let json = r#"{
        "action": "click",
        "target": "button#submit",
        "value": null,
        "wait_ms": 1500,
        "humanize": true,
        "optional": false
    }"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.action, "click");
    assert_eq!(step.target, Some("button#submit".to_string()));
    assert_eq!(step.value, None);
    assert_eq!(step.wait_ms, Some(1500));
    assert_eq!(step.humanize, Some(true));
    assert_eq!(step.optional, Some(false));
}

// ── 2. StepResult 序列化测试 ────────────────────────────────

#[test]
fn test_step_result_serialize() {
    let result = StepResult {
        action: "navigate".to_string(),
        success: true,
        message: "导航到 https://x.com/home".to_string(),
        elapsed_ms: 120,
    };
    let json = serde_json::to_string(&result).expect("序列化失败");
    assert!(json.contains("\"action\":\"navigate\""));
    assert!(json.contains("\"success\":true"));
    assert!(json.contains("\"elapsed_ms\":120"));
}

// ── 3. 批量步骤反序列化测试 ─────────────────────────────────

#[test]
fn test_script_steps_array_deserialize() {
    let json = r#"[
        {"action":"navigate","target":"https://x.com/home","wait_ms":3000},
        {"action":"click","target":"div[data-testid=like]","wait_ms":1000},
        {"action":"type","target":"input[name=text]","value":"Hello","wait_ms":500},
        {"action":"scroll","value":"down","wait_ms":2000},
        {"action":"wait","value":"3000"},
        {"action":"screenshot","value":"/tmp/shot.png"}
    ]"#;
    let steps: Vec<ScriptStep> = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(steps.len(), 6);
    assert_eq!(steps[0].action, "navigate");
    assert_eq!(steps[1].action, "click");
    assert_eq!(steps[2].action, "type");
    assert_eq!(steps[3].action, "scroll");
    assert_eq!(steps[4].action, "wait");
    assert_eq!(steps[5].action, "screenshot");
}

// ── 4. humanize 字段测试 ───────────────────────────────────

#[test]
fn test_humanize_field_present() {
    let json = r#"{"action":"click","target":"button","humanize":true}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.humanize, Some(true));
}

#[test]
fn test_humanize_field_absent() {
    let json = r#"{"action":"click","target":"button"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.humanize, None);
}

// ── 5. optional 字段测试 ───────────────────────────────────

#[test]
fn test_optional_field_present() {
    let json = r#"{"action":"click","target":"button","optional":true}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.optional, Some(true));
}

#[test]
fn test_optional_field_absent() {
    let json = r#"{"action":"click","target":"button"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.optional, None);
}

// ── 6. 未知 action 反序列化（应成功，执行时才会报错） ───────

#[test]
fn test_unknown_action_deserialize() {
    let step = ScriptStep {
        action: "drag".to_string(),
        target: Some("#item".to_string()),
        value: Some("100,200".to_string()),
        wait_ms: None,
        humanize: None,
        optional: None,
    };
    assert_eq!(step.action, "drag");
}

// ── 7. 空 target / value 测试 ──────────────────────────────

#[test]
fn test_empty_target() {
    let json = r#"{"action":"wait","value":"1000"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.target, None);
    assert_eq!(step.value, Some("1000".to_string()));
}

#[test]
fn test_empty_value() {
    let json = r#"{"action":"click","target":"button"}"#;
    let step: ScriptStep = serde_json::from_str(json).expect("反序列化失败");
    assert_eq!(step.target, Some("button".to_string()));
    assert_eq!(step.value, None);
}
