import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

import { Simbolo } from "../semanticsyfera/Simbolo";

/*Clase delegada para poder actuar como validador semantico para todo el lenguaje yfera (.y) */
export class ValidadorSemanticoYfera {

    constructor(compilador, moduloActual) {
        this.compilador = compilador; // Para poder usar reportarErrores y resolver paths
        this.modulo = moduloActual;

        // Inicializamos la tabla global del módulo
        this.modulo.tablaSimbolos = new TablaSimbolos();
    }

    /*Metodo de inicio de analisis */
    async analizar() {
        await this.recorrerAST(this.modulo.ast, this.modulo.tablaSimbolos);
    }

    /*Recorrido por el AST para poder ir validando */

    async recorrerAST(nodos, entornoActual) {
        if (!nodos || !Array.isArray(nodos)) return;

        for (const nodo of nodos) {
            if (!nodo) continue;

            switch (nodo.tipo) {
                case 'DECLARACION_VARIABLE':
                    this.validarDeclaracion(nodo, entornoActual);
                    break;

                case 'DEFINICION_FUNCION':
                    await this.validarFuncion(nodo, entornoActual);
                    break;

                case 'FOR': 
                    const entornoFor = new TablaSimbolos(entornoActual);
                    await this.recorrerAST(nodo.instrucciones, entornoFor);
                    break;

                case 'LOAD_ARCHIVO':
                    await this.validarLoad(nodo, entornoActual);
                    break;

                // PENDIENTES OTROS CASOS
            }
        }
    }

    /*Validacion de declaraciones de variables */
    validarDeclaracion(nodo, entorno) {
        if (entorno.existeLocal(nodo.id)) {
            this.compilador.agregarError(this.modulo.nombre, nodo.id, 'Semantico', `La variable '${nodo.id}' ya fue declarada.`, nodo.linea, nodo.columna);
            return;
        }

        /*pendiente validacion de tipos */
       
        const nuevoSimbolo = new Simbolo(nodo.id, nodo.tipoDato, nodo.valor, nodo.linea, nodo.columna, nodo.esArreglo);

        entorno.setVariable(nuevoSimbolo);
    }

    async validarFuncion(nodo, entornoActual) {

        const entornoLocal = new TablaSimbolos(entornoActual);

        if (nodo.parametros) {
            for (const param of nodo.parametros) {
                const simParam = new Simbolo(param.id, param.tipado, null, param.linea, param.columna);
                entornoLocal.setVariable(simParam);
            }
        }

        await this.recorrerAST(nodo.cuerpo, entornoLocal);
    }

}