
/*Clase delegada para poder hacer el analisis semantico del lenguaje sql */

export class AnalizadorSemanticoSql {

    constructor(dbManejador) {
        this.db = dbManejador;
        this.errores = [];
    }


    /*Metodo que permite recorrer el AST para poder validarlo */
    validar(ast) {
        this.errores = []; 

        for (const nodo of ast) {
            this.analizarNodo(nodo);
        }

        return this.errores;
    }

}