pub mod ai;
pub mod characteristics;

pub const QUESTION: &'static str = r#"**Objective:** Act as the **Lyrathon: Developer Profiler Analysis Engine**. Analyze the provided code samples in Repository A. Extract only the quantitative metrics that define the candidate's core design, structural, and paradigmatic preferences, independent of language syntax or external metadata. Output must strictly be a single, valid JSON object containing only the requested quantitative metrics.

**Constraint:** Only output the final JSON object. Do not include any explanatory text, introduction, or conversation outside of the JSON structure.

### Input Data Simulation

Assume the following input is available for analysis

$[$Insert code here$]$

### Output Structure

Generate a single JSON object in the following format:

{
    "avg_lines_per_function": [The average number of non-comment, non-blank lines of code (LOC) within all functions/methods (e.g., 12.5). **Indicates preference for function size/granularity.**],
    "functional_vs_oop_ratio": [A floating-point ratio representing (Count of top-level functions/lambdas) / (Count of classes/objects/structs). **Indicates design paradigm preference.**],
    "recursion_vs_loop_ratio": [A floating-point ratio representing (Count of recursive function calls) / (Count of explicit iterative loops (for, while)). **Indicates cognitive problem-solving style.**],
    "dependency_coupling_index": [A normalized floating-point score 0.0-1.0 (1.0 being high coupling) measuring the average number of internal dependencies per module/class. **Indicates inter-module design habits.**],
    "modularity_index_score": [A normalized floating-point score 0.0-1.0 (1.0 being high modularity) based on cohesion and information hiding analysis. **Indicates code organization preference.**],
    "avg_nesting_depth": [The average maximum depth of conditional/loop nesting (if/else, switch, for/while) in all functions (e.g., 2.4). **Indicates tolerance for complexity/preference for flattening.**],
    "abstraction_layer_count": [The average number of distinct, non-primitive data types (interfaces, abstract classes, custom types) referenced per major module. **Indicates preference for abstraction.**],
    "immutability_score": [A floating-point score 0.0-1.0 measuring the percentage of variables or objects that are either explicitly declared as immutable or show no sign of mutation after initialization. **Indicates defensive coding style.**],
    "error_handling_centralization_score": [A floating-point score 0.0-1.0 measuring how localized and consistent error handling (try/catch blocks, return values) is across the codebase. **Indicates approach to robustness.**],
    "test_structure_modularity_ratio": [A floating-point ratio of LOC in test helper/fixture files to LOC in actual test case files. **Indicates organization and DRY principle application in testing.**]
}
```
"#;
