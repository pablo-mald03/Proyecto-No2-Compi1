/*Clase delegada para representar el resultado tipado que retorna la query de la base de datos*/

export class ResultadoTipado {
    constructor(valores) {
        this.valores = valores;         
        this.tipo = this.deducirTipo(valores); 
        this.accion = null;            
        this.mensaje = null;             
        this.tabla = null;            
        this.columna = null;           
    }

    /*Metodo helper que permite deducir o inferir el tipo de dato */
    deducirTipo(arreglo) {
        if (!arreglo || arreglo.length === 0) return 'STRING';
        const valorMuestra = arreglo.find(v => v !== null && v !== undefined);
        if (valorMuestra === undefined) return 'STRING';
        const tipoJS = typeof valorMuestra;
        switch (tipoJS) {
            case 'number': return Number.isInteger(valorMuestra) ? 'INT' : 'FLOAT';
            case 'boolean': return 'BOOLEAN';
            case 'string': return valorMuestra.length === 1 ? 'CHAR' : 'STRING';
            default: return 'STRING';
        }
    }
}