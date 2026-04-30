
/*Clase delegada para poder operar con todo lo necesario para recorrer el arbol de compilacion de archivos*/

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

        //PENDIENTE MANEJAR TABLA DE SIMBOLOS
        // this.tablaSimbolos = new TablaSimbolos(); 
    }
}