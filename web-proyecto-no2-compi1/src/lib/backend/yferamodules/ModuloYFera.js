
/*Clase delegada para poder operar con todo lo necesario para recorrer el arbol de compilacion de archivos*/

import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";
export class ModuloYFera {
    constructor(archivoRaiz, ast) {
        this.id = archivoRaiz.id;
        this.parentId = archivoRaiz.parentId;
        this.nombre = archivoRaiz.name;
        this.ast = ast;

        // Aquí guardaremos los hijos (los archivos cargados por LOAD estáticos)
        this.modulosHijos = [];

        this.importsVisitados = new Set();
        this.recursos = {
            componentes: [],
            estilos: []
        };

        this.recursosCompilados = {
            compiledComponentes: "",
            compiledStyles:""
        };


        this.tablaSimbolos = new TablaSimbolos();
        this.tablaSimbolosComponentes = new TablaSimbolos();
        this.tablaSimbolosEstilos = new TablaSimbolos();
    }

    /*Metodos getter que permiten retornar la ruta del recurso de estilos */
    get estilosMergeados() {
        return this.recursos.estilos
            .map(r => `/* source: ${r.rutaRelativa} */\n${r.contenido}`)
            .join('\n');
    }

    /*Metodos getter que permiten retornar la ruta del recurso de componentes */
    get componentesMergeados() {
        return this.recursos.componentes
            .map(r => `/* source: ${r.rutaRelativa} */\n${r.contenido}`)
            .join('\n');
    }
}