import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

/*Clase delegada para la cuarta fase: Validacion semantica del cuerpo main y llamadas */
export class ValidadorCuerpoMain {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;
        this.manejadorDb = manejadorDb;
    }

    /*Metodo principal que valida recursivamente el arbol de ejecucion */
    async validarCuerpoMain(moduloYfera) {
        if (!moduloYfera || !moduloYfera.ast) return;


        const nodoMain = moduloYfera.ast.find(nodo => nodo.tipo === 'FUNCION_MAIN');

        if (!nodoMain) {
            return;
        }

        await this.validarBloqueInstrucciones(
            nodoMain.cuerpo,
            moduloYfera.tablaSimbolos,
            moduloYfera.tablaSimbolosComponentes,
            moduloYfera.nombre
        );


        for (const moduloHijo of moduloYfera.modulosHijos) {
            await this.validarCuerpoMain(moduloHijo);
        }
    }

    /*Metodo que valida un bloque de instrucciones recursivamente */
    async validarBloqueInstrucciones(instrucciones, tablaSimbolos, tablaComponentes, nombreArchivo) {
        if (!instrucciones || !Array.isArray(instrucciones)) return;

        for (const instruccion of instrucciones) {
            if (!instruccion) continue;

            switch (instruccion.tipo) {
                case 'LLAMADA_COMPONENTE':
                    await this.validarLlamadaComponente(instruccion, tablaComponentes, nombreArchivo);
                    break;

                case 'ESTRUCTURA_IF':
                    await this.validarBloqueInstrucciones(
                        instruccion.instrucciones_true,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    if (instruccion.instrucciones_false) {
                        const falseBranch = Array.isArray(instruccion.instrucciones_false)
                            ? instruccion.instrucciones_false
                            : [instruccion.instrucciones_false];
                        await this.validarBloqueInstrucciones(
                            falseBranch,
                            tablaSimbolos,
                            tablaComponentes,
                            nombreArchivo
                        );
                    }
                    break;

                case 'CICLO_WHILE':
                case 'CICLO_DO_WHILE':
                    await this.validarBloqueInstrucciones(
                        instruccion.cuerpo,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    break;

                case 'CICLO_FOR':
                    await this.validarBloqueInstrucciones(
                        instruccion.cuerpo,
                        tablaSimbolos,
                        tablaComponentes,
                        nombreArchivo
                    );
                    break;

                case 'ESTRUCTURA_SWITCH':
                    if (instruccion.casos && Array.isArray(instruccion.casos)) {
                        for (const caso of instruccion.casos) {
                            if (caso.instrucciones) {
                                await this.validarBloqueInstrucciones(
                                    caso.instrucciones,
                                    tablaSimbolos,
                                    tablaComponentes,
                                    nombreArchivo
                                );
                            }
                        }
                    }
                    break;

                case 'ASIGNACION':
                case 'ASIGNACION_ARREGLO':
                    const variable = tablaSimbolos.getVariable(instruccion.id);
                    if (!variable) {
                        this.compilador.agregarError(
                            nombreArchivo,
                            instruccion.id,
                            'Semantico',
                            `Variable '${instruccion.id}' no definida.`,
                            instruccion.linea,
                            instruccion.columna
                        );
                    }
                    break;

                case 'BREAK':
                case 'CONTINUE':
                    break;

                default:
                    break;
            }
        }
    }

    /*Metodo que valida una llamada a componente */
    async validarLlamadaComponente(nodo, tablaComponentes, nombreArchivo) {
        const nombreComponente = nodo.nombre;

        const simboloComponente = tablaComponentes.getVariable(nombreComponente);

        if (!simboloComponente) {
            this.compilador.agregarError(
                nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' no ha sido definido.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        const parametrosEsperados = simboloComponente.parametros || [];
        const argumentosRecibidos = nodo.argumentos || [];

        if (argumentosRecibidos.length !== parametrosEsperados.length) {
            this.compilador.agregarError(
                nombreArchivo,
                nombreComponente,
                'Semantico',
                `El componente '${nombreComponente}' espera ${parametrosEsperados.length} parámetros, ` +
                `pero se enviaron ${argumentosRecibidos.length}.`,
                nodo.linea,
                nodo.columna
            );
            return;
        }

        for (let i = 0; i < parametrosEsperados.length; i++) {
            const paramEsperado = parametrosEsperados[i];
            const argRecibido = argumentosRecibidos[i];

            if (argRecibido && argRecibido.tipo) {
                const tipoArg = this.obtenerTipoArgumento(argRecibido);

                if (tipoArg && tipoArg !== 'VARIABLE' && !this.sonTiposCompatibles(paramEsperado.tipo, tipoArg)) {
                    this.compilador.agregarError(
                        nombreArchivo,
                        nombreComponente,
                        'Semantico',
                        `Parámetro '${paramEsperado.nombre}' (${i + 1}) espera tipo ${paramEsperado.tipo}, ` +
                        `pero se envió tipo ${tipoArg}.`,
                        nodo.linea,
                        nodo.columna
                    );
                }

                // Validar si se espera arreglo pero se envió otra cosa
                if (paramEsperado.esArreglo &&
                    tipoArg !== 'VARIABLE' &&
                    argRecibido.tipo !== 'ACCESO_ARREGLO' &&
                    argRecibido.tipo !== 'ARREGLO_INICIALIZADO' &&
                    argRecibido.tipo !== 'ARREGLO_VACIO' &&
                    argRecibido.tipo !== 'ID') {
                    this.compilador.agregarError(
                        nombreArchivo,
                        nombreComponente,
                        'Semantico',
                        `Parámetro '${paramEsperado.nombre}' (${i + 1}) espera un arreglo.`,
                        nodo.linea,
                        nodo.columna
                    );
                }
            }
        }
    }

    /*Metodo auxiliar para obtener el tipo de un argumento */
    obtenerTipoArgumento(nodo) {
        if (!nodo) return null;

        switch (nodo.tipo) {
            case 'INT': return 'ENTERA';
            case 'FLOAT': return 'FLOAT';
            case 'VALOR_CADENA': return 'CADENA';
            case 'CHAR': return 'CARACTER';
            case 'BOOL': return 'BOOLEANA';
            case 'ID': return 'VARIABLE';
            case 'ACCESO_ARREGLO': return 'ARREGLO';
            default: return null;
        }
    }

    /*Metodo que compara tipos compatibles */
    sonTiposCompatibles(tipoDestino, tipoValor) {
        if (tipoDestino === tipoValor) return true;
        if (tipoDestino === 'FLOAT' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'CARACTER') return true;
        if (tipoDestino === 'CARACTER' && tipoValor === 'ENTERA') return true;
        if (tipoDestino === 'ENTERA' && tipoValor === 'BOOLEANA') return true;
        return false;
    }
}