import { TablaSimbolos } from "../semanticsyfera/TablaSimbolos";

/*Clase delegada para poder hacer la validacion semantica de los estilos */
export class ValidadorSemanticoStyles {

    constructor(compilador, manejadorDb) {
        this.compilador = compilador;     
        this.manejadorDb = manejadorDb;
    }

    /*Metodo que permite validar recursivamente los estilos de cada modulo*/
    async validarEstilos(moduloYFera) {
        for (const recursoEstilo of moduloYFera.recursos.estilos) {
            await this.analizarBloqueStyles(
                recursoEstilo,
                moduloYFera.tablaSimbolosEstilos
            );
        }

        for (const hijo of moduloYFera.modulosHijos) {
            await this.validarEstilos(hijo);
        }
    }

    /*Metodo que analiza un bloque de CSS mergeado y construye su tabla de símbolos */
    async analizarBloqueStyles(recursoEstilo, tablaSimbolosEstilos) {
        try {
            const astStyles = this.parsearCSS(recursoEstilo.contenido);
            
            for (const regla of astStyles) {
                await this.validarReglaCSS(
                    regla,
                    recursoEstilo,
                    tablaSimbolosEstilos
                );
            }
        } catch (error) {
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo, 
                recursoEstilo.rutaRelativa,
                'ParseoStyles',
                `Error al parsear: ${error.message}`    
            );
        }
    }

    /*Valida una regla Styles individual con trazabilidad*/
    async validarReglaCSS(regla, recursoEstilo, tablaSimbolos) {
        if (tablaSimbolos.existe(regla.selector)) {
            const definicionPrevia = tablaSimbolos.obtener(regla.selector);
            
            this.compilador.agregarError(
                recursoEstilo.nombreArchivo,   
                regla.selector,
                'SemanticoStyles',
                `Selector duplicado: '${regla.selector}' ` +
                `(previamente definido en ${definicionPrevia.definidoEn})`,
                regla.linea,
                regla.columna
            );
        } else {
            // Insertar con trazabilidad
            tablaSimbolos.insertar(regla.selector, {
                tipo: 'selector',
                propiedades: regla.propiedades,
                definidoEn: recursoEstilo.nombreArchivo,  
                rutaRelativa: recursoEstilo.rutaRelativa
            });
        }

        // Más validaciones...
        await this.validarPropiedadesCSS(regla, recursoEstilo);
    }

    /* Valida propiedades las propiedades de los estilos*/
    async validarPropiedadesCSS(regla, recursoEstilo) {
        for (const prop of regla.propiedades) {
            // Validar que la propiedad exista en el set permitido
            if (!this.esPropiedadCSSValida(prop.nombre)) {
                this.compilador.agregarError(
                    recursoEstilo.nombreArchivo,
                    prop.nombre,
                    'SemanticoStyles',
                    `Propiedad CSS no reconocida: '${prop.nombre}'`,
                    prop.linea,
                    prop.columna
                );
            }
        }
    }

    /*Metodo que permite parsear el archivo de styles */
    parsearCSS(css) {
        // PENDIENTE
        return []; // Placeholder
    }

    /*Metodo HARDCODEADO  */
    esPropiedadCSSValida(nombre) {
     
        const propiedadesPermitidas = new Set([
            'color', 'background', 'margin', 'padding', 
            'font-size', 'display', 'position', 
        ]);
        return propiedadesPermitidas.has(nombre);
    }
}