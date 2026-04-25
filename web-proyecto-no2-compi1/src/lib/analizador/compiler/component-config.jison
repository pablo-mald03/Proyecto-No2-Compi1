/* Seccion analizador Lexico */

%lex
%options ranges yylineno

%x string
%s interp

%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/


/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

"float"                         return 'FLOAT';

"char"                          return 'CHAR';

"function"                      return 'FUNCTION';

/*------***---Reconocimiento de propiedades de componentes---***------*/

"label"                         return 'LABEL';

"id"                            return 'ID';

"value"                         return 'VALUE';

/*------***---Reconocimiento de valores de propiedades---***------*/

"true"                          return 'TRUE';

"false"                         return 'FALSE';

/*------***---Reconocimiento de componentes---***------*/

"T"                             return 'TEXT';

"IMG"                           return 'IMG';

"FORM"                          return 'FORM';

"INPUT_TEXT"                    return 'INPUT_TEXT';

"INPUT_NUMBER"                  return 'INPUT_NUMBER';

"INPUT_BOOL"                    return 'INPUT_BOOL';

"SUBMIT"                        return 'SUBMIT';


/*------***---Reconocimiento de palabras reservadas del lenguaje---***------*/

"for"                         return 'FOR';

"each"                        return 'EACH';

"track"                       return 'TRACK';

"empty"                       return 'EMPTY';

"if"                          return 'IF';

"else"                        return 'ELSE';

"Switch"                      return 'SWITCH';

"case"                        return 'CASE';

"default"                     return 'DEFAULT';

/*------***---Reconocimiento de caracteres especiales del lenguaje---***------*/

","                         return 'COMA';

":"                         return 'DOS_PUNTOS';

/*------***---Reconocimiento de operadores aritmeticos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

"%"                     return 'MODULO';


/*------***---Reconocimiento de operadores de comparacion---***------*/

">="                        return 'MAYOR_IGUAL';

"<="                        return 'MENOR_IGUAL';

">"                         return 'MAYOR';

"<"                         return 'MENOR';

"=="                        return 'IGUALACION';

"!="                        return 'DIFERENTE';


/*------***---Reconocimiento de operadores logicos---***------*/

"||"                            return 'OR';

"&&"                            return 'AND';

"!"                             return 'NOT';

/*------***--- Agrupaciones y delimitadores ---***------*/

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';


/*------***--- MANEJO DE STRINGS y expresiones dentro de ellos---***------*/


"\""                            { this.pushState('string'); return 'COMILLA'; }

<string>"\""                    { this.popState(); return 'COMILLA'; }

<string>"$"[a-zA-Z_][a-zA-Z0-9_]* { return 'VARIABLE_DOLAR'; }

<string>"`"                     { this.pushState('interp'); return 'BACKTICK'; }

<interp>"`"                     { this.popState(); return 'BACKTICK'; }

<string>[^\"$`]+                { return 'TEXTO_CADENA'; }

<string>"$"                     { return 'TEXTO_CADENA'; }

<string>"\\\""                  { return 'TEXTO_CADENA'; }

/*------***---Reconocimiento de valores de variables---***------*/

[0-9]+"."[0-9]+\b               return 'DECIMAL';

[0-9]+\b                        return 'ENTERO';

"$"[a-zA-Z_][a-zA-Z0-9_]* return 'VARIABLE_DOLAR';

[a-zA-Z][a-zA-Z0-9_]* return 'IDENTIFICADOR';

"@"[a-zA-Z][a-zA-Z0-9_]* return 'ARROBA_VAR';


.                           {
                                if (!yy.errores) yy.errores = [];
                                
                                yy.errores.push({
                                    lexema: yytext,
                                    tipo: "Lexico",
                                    fila: yylloc.first_line,
                                    columna: yylloc.first_column + 1,
                                    descripcion: "Caracter no valido en el lenguaje .comp"
                                });
                            }

<<EOF>>                         return 'EOF';

/lex

/*---****===== Seccion del analizador Sintactico =====****---*/

%{
    /* Diccionario para traducir tokens tecnicos a nombres amigables */
    const diccionarioTokens = {
        "PUNTO_COMA": "';'",
        "COMA": "' , '",
        "LLAVE_APERTURA": "'{'",
        "LLAVE_CIERRE": "'}'",
        "PARENT_APERTURA": "'('",
        "PARENT_CIERRE": "')'",
        "CORCHETE_APERTURA": "'('",
        "CORCHETE_CIERRE": "')'",
        "MAS": "'+'",
        "MENOS": "'-'",
        "MULTIPLICACION": "'*'",
        "DIVISION": "'/'",
        "MODULO": "'%'",
        "FOR": "'for'",
        "IGUAL": "'='",
        "EOF": "el fin del archivo"
    };

    /* Función auxiliar para reportar errores al arreglo global */
    function reportarError(yy, info) {
        const nuevoError = {
            tipo: 'ERROR_SINTACTICO',
            descripcion: info.descripcion,
            fila: info.loc.first_line,
            columna: info.loc.first_column + 1
        };
    
        yy.errores.push({
            lexema: info.texto || "N/A",
            tipo: "Sintactico",
            fila: nuevoError.fila,
            columna: nuevoError.columna,
            descripcion: nuevoError.descripcion
        });
    
        return nuevoError;
    } 

    /* Funcion auxiliar para traducir los tokens esperados que Jison provee */
    function traducirEsperados(esperados) {

        if (!esperados || esperados.length === 0) return "algo diferente";

        const traducidos = esperados.map(token => {
            const tokenLimpio = token.replace(/'/g, "");
            return diccionarioTokens[tokenLimpio] || tokenLimpio;
        });

        if (traducidos.length > 1) {
            const ultimo = traducidos.pop();
            return traducidos.join(", ") + " o " + ultimo;
        }
        return traducidos[0];
    }
%}


/*----***Definicion de presedencia***----*/

/*----***Definicion de operadores logicos***----*/

%left 'OR'
%left 'AND'

/*----***Definicion de operadores de comparacion***----*/

%left 'IGUALACION' 'DIFERENTE'
%left 'MAYOR' 'MENOR' 'MAYOR_IGUAL' 'MENOR_IGUAL'

/*----***Definicion de operadores matematicos***----*/

%left 'MAS' 'MENOS'
%left 'MULTIPLICACION' 'DIVISION' 'MODULO'
%right 'NOT' 'UMENOS'

/*----Simbolo inicial----*/

%start inicio

%%

/*-----=====-----Produccion principal de inicio de lectura-----=====-----*/

inicio  : definicion_lenguaje  EOF 
        { 
            return $3; 
        }
        | error EOF 
        {
            reportarError(yy, {
                descripcion: 'Error en la estructura del archivo de componentes',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion principal de la definicion del lenguaje .comp-----=====-----*/

definicion_lenguaje : 
                    {{

                    }}
                    ;