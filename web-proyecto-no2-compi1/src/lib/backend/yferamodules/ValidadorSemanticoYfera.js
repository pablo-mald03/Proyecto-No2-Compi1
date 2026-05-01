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
                case 'INICIALIZACION_VARIABLE':
                    this.validarDeclaracion(nodo, entornoActual);
                    break;

                case 'FUNCION':
                    await this.validarFuncion(nodo, entornoActual);
                    break;

                case 'FUNCION_MAIN': 
                    const entornoMain = new TablaSimbolos(entornoActual);
                   
                    await this.recorrerAST(nodo.cuerpo, entornoMain);
                    break;

                case 'CICLO_WHILE': 
                case 'CICLO_DO_WHILE':
                    const entornoCiclo = new TablaSimbolos(entornoActual);
                    await this.recorrerAST(nodo.cuerpo, entornoCiclo);
                    break;

                case 'LOAD_ARCHIVO': 
                    await this.validarLoad(nodo, entornoActual);
                    break;

                //Pendiente demas codigo
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

    /*Metodo que permite validar la semantica dentro de una funcion*/
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

    /*Metodo que permite validar el load recursivamente en cada .y llamado*/
    async validarLoad(nodo, entornoActual) {
        let rutaLoad = "";

        if (nodo.uri.tipo === 'VALOR_CADENA') {
            rutaLoad = nodo.uri.valor.trim();
        }
        else if (nodo.uri.tipo === 'IDENTIFICADOR') {
            const nombreVar = nodo.uri.valor;
            const variable = entornoActual.getVariable(nombreVar);

            if (!variable) {
                this.compilador.agregarError(this.modulo.nombre, nombreVar, 'Semantico', `Variable '${nombreVar}' no definida.`, nodo.linea, nodo.columna);
                return;
            }
            if (variable.tipoDato !== 'CADENA') {
                this.compilador.agregarError(this.modulo.nombre, nombreVar, 'Semantico', `El LOAD requiere una ruta STRING, se recibió ${variable.tipoDato}.`, nodo.linea, nodo.columna);
                return;
            }

            if (variable.valor) {

                rutaLoad = variable.valor.trim();
            } else {
                return;
            }
        }

        if (rutaLoad) {
            const archivoSiguiente = await this.compilador.resolverPathRelativo(rutaLoad, this.modulo.parentId);

            if (archivoSiguiente) {
                const moduloHijo = await this.compilador.procesarModuloY(archivoSiguiente);
                if (moduloHijo) {
                    this.modulo.modulosHijos.push(moduloHijo);
                }
            } else {
                this.compilador.agregarError(this.modulo.nombre, rutaLoad, 'Semantico', `Error de Load: No se encontró el archivo '${rutaLoad}'.`, nodo.linea, nodo.columna);
            }
        }
    }

}