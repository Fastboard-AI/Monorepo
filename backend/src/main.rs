use std::error::Error;

use backend::{db::MainDatabase, endpoints};
use dotenv::dotenv;
use rocket::routes;
use rocket_db_pools::Database;
use rocket_cors::{AllowedOrigins, CorsOptions};

#[rocket::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv().ok(); // Optional - env vars may come from Docker instead

    let cors = CorsOptions::default()
        .allowed_origins(AllowedOrigins::all())
        .to_cors()
        .unwrap();

    let _server = rocket::build()
        .attach(MainDatabase::init())
        .attach(cors)
        .mount("/api/", routes![
            endpoints::add_to_db,
            endpoints::analyse_repo,
            endpoints::analyse_github,
            // Jobs
            endpoints::get_jobs,
            endpoints::get_job,
            endpoints::create_job,
            endpoints::update_job,
            endpoints::delete_job,
            // Teams
            endpoints::get_teams,
            endpoints::get_team,
            endpoints::create_team,
            endpoints::update_team,
            endpoints::delete_team,
            endpoints::add_team_member,
            endpoints::update_team_member,
            endpoints::remove_team_member,
            // Sourcing
            endpoints::search_candidates,
            // Candidates
            endpoints::create_candidate,
            endpoints::add_candidate_to_job,
            endpoints::get_job_candidates,
            endpoints::remove_candidate_from_job,
            // GitHub Analysis
            endpoints::analyze_github,
            endpoints::analyze_github_deep,
            endpoints::get_github_profile,
            endpoints::get_github_profile_deep,
            // Take-Home Projects
            endpoints::generate_take_home,
            endpoints::get_take_home,
        ])
        .launch()
        .await?;

    Ok(())
}