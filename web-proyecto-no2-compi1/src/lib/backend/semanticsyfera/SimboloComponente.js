/*Clase delegada para poder representar los simbolos dentro de los .comp */

export class SimboloComponente {
    constructor(id, parametros, valor, linea, columna) {
        this.id = id;              
        this.parametros = parametros;   
        this.valor = valor;              
        this.linea = linea;
        this.columna = columna;
        this.tipoDato = 'COMPONENTE';
        this.invocaciones = [];          
    }
}