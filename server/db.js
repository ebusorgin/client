const {Client} = require("pg");

class Db {
    constructor() {
        this.db = new Client({
            user: 'postgres',
            host: 'localhost',
            database: 'postgres',
            password: 'postgres',
            port: 5432,
        });
        this.db.connect();
    }
    async query(query,params = []) {
        const result = await this.db.query(query,params);
        return result.rows
    }


}
module.exports = Db;
