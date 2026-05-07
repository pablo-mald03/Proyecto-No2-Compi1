/*Clase delegada para representar a cada objeto importado */
export class RecursoImportado {
    constructor(nombreArchivo, rutaRelativa, contenido, idArchivo) {
        this.nombreArchivo = nombreArchivo;  
        this.rutaRelativa = rutaRelativa;    
        this.contenido = contenido;         
        this.idArchivo = idArchivo;         
    }
}