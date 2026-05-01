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

    /*Busqueda de variables dentro del ambito tanto local como global */
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

    /*Metodo que permite buscar variables ya declaradas dentro del ambito global*/
    existeLocal(id) {
        return this.variables.has(id);
    }
}