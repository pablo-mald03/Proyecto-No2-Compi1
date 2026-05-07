/*Clase delegada para poder representar a un simbolo de estilos dentro de la propia tabla de simbolos */

export class SimboloEstilos {
    constructor(id, tipoDato, valor, linea, columna) {
        this.id = id;
        this.tipoDato = tipoDato; 
        this.valor = valor;      
        this.linea = linea;
        this.columna = columna;
    }
}