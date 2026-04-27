import lexerComponent from "$lib/analizador/lexical/lexical-component";
import lexerDatabase from "$lib/analizador/lexical/lexical-database";
import lexerYFera from "$lib/analizador/lexical/lexical-yfera";
import lexerStyles from "$lib/analizador/lexical/lexical-estilos";

/*Clase delegada que permite manejar el pintado dinamico de texto*/
export class SintaxisManager {

    constructor() {
        this.parsers = {
            'y': lexerYFera,
            'comp': lexerComponent,
            'styles': lexerStyles,
            'terminal': lexerDatabase
        };
    }

    /*Metodo que permite colorear el texto dinamicamente */
    highlight(text, extension) {
        if (!text) return '';

        if (extension === 'sqlite') {
            return this.escapeHtml(text);
        }

        const parser = this.parsers[extension];
        if (!parser) return this.escapeHtml(text);

        try {
            const tokens = parser.parse(text);
            return this.tokensToHtml(tokens);
        } catch (e) {

            /*Retorna el texto con los escapes por si hay error */
            return this.escapeHtml(text);
        }
    }

    /*Metodo que permite transformar a una clase css el texto */
    tokensToHtml(tokensObtenidos) {
        return tokensObtenidos.map(token => {
            const lexemaSeguro = token.lexema ? token.lexema : '';
            const safeText = this.escapeHtml(lexemaSeguro);

            console.log(`token: ${token.lexema}`)

            return `<span class="token-${token.tipo.toLowerCase()}">${safeText}</span>`;
        }).join('');
    }
    /*Metodo que permite escapar los caracteres especiales */
    escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

}