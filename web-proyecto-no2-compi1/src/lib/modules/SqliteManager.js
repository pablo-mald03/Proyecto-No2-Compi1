/*Libreria de bases de datos */
import initSqlJs from 'sql.js'

class SqliteManager {

    constructor() {
        this.db = null;
        this.SQL = null;
    }

    //Metodo que permite inicializar la base de datos
    async init(fileContentArrayBuffer = null) {
        try {
            if (!this.SQL) {
               this.SQL = await initSqlJs({
                    locateFile: (file) => {
                        if (file.endsWith('.wasm')) return '/sql-wasm.wasm';
                        return file;
                    }
                });
            }

            if (this.db) {
                this.db.close();
            }

            if (fileContentArrayBuffer instanceof Uint8Array && fileContentArrayBuffer.length > 0) {
                this.db = new this.SQL.Database(fileContentArrayBuffer);
            } else if (fileContentArrayBuffer instanceof ArrayBuffer && fileContentArrayBuffer.byteLength > 0) {
                this.db = new this.SQL.Database(new Uint8Array(fileContentArrayBuffer));
            } else {
                this.db = new this.SQL.Database();
            }

            return true;
        } catch (err) {
            console.error("Error interno SqliteManager:", err);
            throw err;
        }
    }

    //Metodo que permite ejecutar una instruccion sql en la base de datos
    execute(sqlString) {
        if (!this.db) throw new Error("Motor SQLite no inicializado.");
        return this.db.exec(sqlString);
    }

    //Metodo que permite exportar la informacion a binario
    exportData() {
        if (!this.db) return null;
        return this.db.export();
    }

}

/*Instancia singleton para el manager */
export const dbManejador = new SqliteManager();