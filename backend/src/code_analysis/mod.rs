pub mod ai;
pub mod characteristics;

pub const QUESTION: &'static str = r#"You are analyzing FULL SOURCE FILES from a developer's GitHub repositories to profile their coding style.

Analyze the code structure, patterns, and style to extract these metrics. Output ONLY a valid JSON object with these 10 numeric fields:

{
    "avg_lines_per_function": <average lines per function/method, e.g. 15.5>,
    "functional_vs_oop_ratio": <0.0 = pure OOP, 1.0 = pure functional>,
    "recursion_vs_loop_ratio": <0.0 = loops only, 1.0 = recursion only>,
    "dependency_coupling_index": <0.0 = loose coupling, 1.0 = tight coupling>,
    "modularity_index_score": <0.0 = monolithic, 1.0 = highly modular>,
    "avg_nesting_depth": <average nesting level, e.g. 2.3>,
    "abstraction_layer_count": <average abstraction layers per module, e.g. 3.0>,
    "immutability_score": <0.0 = mutable, 1.0 = immutable preference>,
    "error_handling_centralization_score": <0.0 = scattered, 1.0 = centralized>,
    "test_structure_modularity_ratio": <0.0 = inline tests, 1.0 = modular test structure>
}

Guidelines:
- Analyze function sizes, class structures, and module organization
- Look for patterns: const/let usage, Option/Result types, try/catch placement
- Consider language idioms (Rust uses Result, JS uses try/catch, etc.)
- If no tests found, estimate test_structure_modularity_ratio as 0.5
- Output ONLY the JSON object, no explanation or markdown
"#;
