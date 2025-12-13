use crate::code_analysis::characteristics::CodeCharacteristics;

//use crate::{code_analysis::characteristics::CodeCharacteristics, db::MainDatabase};
//
//#[derive(Deserialize)]
//#[serde(crate = "rocket::serde")]
//pub struct MatchCandidates {
//    target: CodeCharacteristics
//}
//
//#[derive(FromRow)]
//struct CandidateToCompare {
//    id: u32,
//    employed: bool
//}
//
//#[post("/match_candidates", data = "<data>")]
//pub async fn match_candidates(data: json::Json<MatchCandidates>, mut db: Connection<MainDatabase>) {
//    let res = sqlx::query_as::<_, CandidateToCompare>("SELECT (id, style, employed) FROM candidates WHERE employed IS FALSE")
//        .fetch_all(&mut **db).await
//        .unwrap();
//
//    let seralised = res.into_iter()
//        .map(|row| row);
//
//}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Weights {
    pub avg_lines_per_function: f32,
    pub functional_vs_oop_ratio: f32,
    pub recursion_vs_loop_ratio: f32,
    pub dependency_coupling_index: f32,
    pub modularity_index_score: f32,
    pub avg_nesting_depth: f32,
    pub abstraction_layer_count: f32,
    pub immutability_score: f32,
    pub error_handling_centralization_score: f32,
    pub test_structure_modularity_ratio: f32,
}

impl Default for Weights {
    fn default() -> Self {
        Weights {
            abstraction_layer_count: 1.0,
            avg_lines_per_function: 1.0,
            avg_nesting_depth: 1.0,
            dependency_coupling_index: 1.0,
            error_handling_centralization_score: 1.0,
            functional_vs_oop_ratio: 1.0,
            immutability_score: 1.0,
            modularity_index_score: 1.0,
            recursion_vs_loop_ratio: 1.0,
            test_structure_modularity_ratio: 1.0
        }
    }
}

pub fn match_styles(target: CodeCharacteristics, candidates: Vec<CodeCharacteristics>, weights: Option<Weights>) -> Vec<(CodeCharacteristics, f32)> {
    let mut ret = Vec::new();
    let w = weights.unwrap_or_default();

    fn d_sq(a: f32, b: f32) -> f32 { (a - b).powi(2) }

    for candidate in candidates {
        let sum = w.dependency_coupling_index * d_sq(target.dependency_coupling_index, candidate.dependency_coupling_index)
            //+ w.abstraction_layer_count * d_sq(target.abstraction_layer_count, candidate.abstraction_layer_count)
            //+ w.avg_lines_per_function * d_sq(target.avg_lines_per_function, candidate.avg_lines_per_function)
            //+ w.avg_nesting_depth * d_sq(target.avg_nesting_depth, candidate.avg_nesting_depth)
            + w.error_handling_centralization_score * d_sq(target.error_handling_centralization_score, candidate.error_handling_centralization_score)
            + w.functional_vs_oop_ratio * d_sq(target.functional_vs_oop_ratio, candidate.functional_vs_oop_ratio)
            + w.immutability_score * d_sq(target.immutability_score, candidate.immutability_score)
            + w.modularity_index_score * d_sq(target.modularity_index_score, candidate.modularity_index_score)
            + w.recursion_vs_loop_ratio * d_sq(target.recursion_vs_loop_ratio, candidate.recursion_vs_loop_ratio)
            + w.test_structure_modularity_ratio * d_sq(target.test_structure_modularity_ratio, candidate.test_structure_modularity_ratio);

        ret.push((candidate, sum.sqrt()));
    }

    ret
}