/*Clase delegada para poder implementar la tabla de simbolos que permite validar semanticamente todo */
export class TablaSimbolos {

    constructor(padre = null) {
        this.padre = padre;
        this.variables = new Map();
    }

    /*Metodo que permite guardar una variable en el ambito local */
    setVariable(simbolo) {
        this.variables.set(simbolo.id, simbolo);
    }

    /*Metodo que permite insertar por id y valor*/
    insertar(id, simbolo) {
        simbolo.id = id;
        this.variables.set(id, simbolo);
    }

    /*Metodo que busca una variable en el ámbito local y luego en el padre */
    getVariable(id) {
        let entornoActual = this;
        while (entornoActual !== null) {
            if (entornoActual.variables.has(id)) {
                return entornoActual.variables.get(id);
            }
            entornoActual = entornoActual.padre;
        }
        return null;
    }

    /* Metodo que permite ser el alieas de getVariable para compatibilidad */
    obtener(id) {
        return this.getVariable(id);
    }

    /*Metodo que verifica si existe en el ámbito local */
    existeLocal(id) {
        return this.variables.has(id);
    }

    /* Verifica si existe la variable en cualquier ambito (local + padres)*/
    existeGlobal(id) {
        return this.getVariable(id) !== null;
    }
}