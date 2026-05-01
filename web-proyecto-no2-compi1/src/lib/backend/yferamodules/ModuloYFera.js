
/*Clase delegada para poder operar con todo lo necesario para recorrer el arbol de compilacion de archivos*/

import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";
export class ModuloYFera {
    constructor(archivoRaiz, ast) {
        this.id = archivoRaiz.id;
        this.nombre = archivoRaiz.name;
        this.ast = ast;
        
        // Aquí guardaremos los hijos (los archivos cargados por LOAD estáticos)
        this.modulosHijos = []; 

        this.importsVisitados = new Set();
        this.recursos = {
            componentes: "",
            estilos: ""
        };

     
        this.tablaSimbolos = new TablaSimbolos(); 
    }

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
                this.compilador.agregarError(this.modulo.nombre, nombreVar, 'Semantico', `Instruccion load requiere una ruta de tipo 'String', se coloco tipo: ${variable.tipoDato}.`, nodo.linea, nodo.columna);
                return;
            }

            if (variable.valor) {
                rutaLoad = variable.valor.replace(/['"]/g, '').trim();
            } else {
                return; 
            }
        }

        if (rutaLoad) {
            const archivoSiguiente = await this.compilador.resolverPathRelativo(rutaLoad, this.modulo.id); 

            if (archivoSiguiente) {
                const moduloHijo = await this.compilador.procesarModuloY(archivoSiguiente);
                if (moduloHijo) {
                    this.modulo.modulosHijos.push(moduloHijo);
                }
            } else {
                this.compilador.agregarError(this.modulo.nombre, rutaLoad, 'Semantico', `Error de load: No se encontro "${rutaLoad}".`, nodo.linea, nodo.columna);
            }
        }
    }
}