/*Clase delegada para poder representar a un simbolo dentro de la propia tabla de simbolos */
export class Simbolo {
    constructor(id, tipoDato, valor, linea, columna, esArreglo = false) {
        this.id = id;
        this.tipoDato = tipoDato; 
        this.valor = valor;      
        this.linea = linea;
        this.columna = columna;
        this.esArreglo = esArreglo;
    }
}