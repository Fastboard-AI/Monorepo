use std::{error::Error, io};

use backend::{db::MainDatabase, endpoints};
use dotenv::dotenv;
use rocket::routes;
use rocket_db_pools::Database;


#[rocket::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv()?;

    let _server = rocket::build()
        .attach(MainDatabase::init())
        .mount("/", routes![endpoints::add_to_db, endpoints::analyse_repo])
        .launch()
        .await?;

    Ok(())
}