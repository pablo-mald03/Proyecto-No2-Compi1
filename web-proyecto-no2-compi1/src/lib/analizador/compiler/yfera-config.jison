/* Seccion analizador Lexico */

%lex
%options ranges yylineno
%%

/*Espacios y saltos de linea*/

\s+                   /* ignorar espacios */

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*           /*Ignorar comentario de linea*/

"/*"([^*]|\*+[^*/])*(\*+"/")           /*Ignorar comentario multilinea*/

/*------***---Reconocimiento del ID especial de main---***------*/

"main"                          return 'MAIN';

/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

"float"                         return 'FLOAT';

"char"                          return 'CHAR';

"function"                          return 'FUNCTION';

/*------***---Reconocimiento de palabras reservadas de valores de variables---***------*/

"True"                          return 'TRUE';

"False"                         return 'FALSE';


/*------***---Reconocimiento de caracteres especiales del lenguaje---***------*/

","                         return 'COMA';

";"                         return 'PUNTO_COMA';

":"                         return 'DOS_PUNTOS';

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';


/*------***---Reconocimiento de palabras reservadas de estructuras de control---***------*/

"while"                         return 'WHILE';

"for"                           return 'FOR';

"if"                            return 'IF';

"else"                          return 'ELSE';

"switch"                        return 'SWITCH';

"case"                          return 'CASE';

"break"                         return 'BREAK';

"default"                       return 'DEFAULT';

"do"                            return 'DO';

/*------***---Reconocimiento de operadores aritmeticos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

"%"                     return 'PORCENTAJE';


/*------***---Reconocimiento de operadores de comparacion---***------*/

">"                         return 'MAYOR';

"<"                         return 'MENOR';

">="                        return 'MAYOR_IGUAL';

"<="                        return 'MENOR_IGUAL';

"=="                        return 'IGUALACION';

"!="                        return 'DIFERENTE';


/*------***---Reconocimiento de operadores logicos---***------*/

"||"                            return 'OR';

"&&"                            return 'AND';

"!"                             return 'NOT';

/*------***---Reconocimiento de palabras con contexto especial del lenguaje---***------*/

"import"                            return 'IMPORT';

"execute"                           return 'EXECUTE';

"load"                              return 'LOAD';


/*------***---Reconocimiento de valores de variables---***------*/

[0-9]+"."[0-9]+\b               return 'DECIMAL';

[0-9]+\b                        return 'ENTERO';

[a-zA-Z][a-zA-Z0-9_-]*          return 'IDENTIFICADOR';

"@"[a-zA-Z][a-zA-Z0-9_-]*       return 'ARROBA_VAR';

// Para caracteres escapados
"'"('\\'.)"'"                   return 'VALOR_CHAR'; 

"'"."'"                         return 'VALOR_CHAR';





.                           {
                                if (!yy.errores) yy.errores = [];
                                
                                yy.errores.push({
                                    lexema: yytext,
                                    tipo: "Lexico",
                                    fila: yylloc.first_line,
                                    columna: yylloc.first_column + 1,
                                    descripcion: "Caracter no valido en el lenguaje .y"
                                });
                            }

<<EOF>>                         return 'EOF';

/lex

/*---****===== Seccion del analizador Sintactico =====****---*/


/*----***Definicion de presedencia***----*/
/*%left 'MAS' 'MENOS'
%left 'MULTIPLICACION' 'DIVISION' 'PORCENTAJE'
%right UMENOS 
%left UMAS
*/

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
                descripcion: 'Error en la estructura del archivo de yfera',
                loc: @1,
                texto: yytext
            });

            return null; 
        }
        ;

/*-----=====-----Produccion principal de la definicion del lenguaje .y-----=====-----*/

definicion_lenguaje : 
                    {{

                    }}
                    ;