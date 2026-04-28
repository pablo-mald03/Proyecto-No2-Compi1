/* Seccion analizador Lexico */

%lex
%options ranges yylineno
%%

/*Espacios y saltos de linea*/

\s+                   return 'ESPACIO';

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*---*****----Apartado de comentarios----*****---*/

"#".*                                 return 'COMENTARIO';

"/*"([^*]|\*+[^*/])*(\*+"/")          return 'COMENTARIO';

/*---*****----Apartado de palabras reservadas ----*****---*/

"TABLE"                         return 'TABLE';

"COLUMNS"                         return 'COLUMNS';

"DELETE"                         return 'DELETE';

"IN"                         return 'IN';

/*---*****----Apartado de tipos de datos----*****---*/

"NULL"|"INTEGER"|"INT"|"TINYINT"|"BIGINT"|"REAL"|"DOUBLE"|"FLOAT"|"TEXT"|"VARCHAR"|"CHAR"|"DECIMAL"|"NUMERIC"|"BOOLEAN"|"DATE"|"BLOB"|"VARBINARY"                         return 'TIPO';


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

/*---*****---- Apartado de caracteres especiales ----*****---*/

"["                         return 'CORCHETE_APERTURA';

"]"                         return 'CORCHETE_CIERRE';

"="                         return 'IGUAL';

";"                         return 'PUNTO_COMA';

","                         return 'COMA';

"."                         return 'PUNTO';


/*------***--- Reconocimiento de numeros decimales y enteros---***------*/

[0-9]+(\.[0-9]+)?\b             return 'NUMERO';

\"[^\"]*\"                  { return 'STRING'; }


/*------***--- Reconocimiento de nombres de atributos y tablas---***------*/

[a-zA-Z_][a-zA-Z0-9_-]*         return 'IDENTIFICADOR';

.                               return 'ERROR_LEXICO';

<<EOF>>                         return 'EOF';

/lex

/*---****===== Seccion del analizador Sintactico =====****---*/


/*----Simbolo inicial----*/

/*---****===== Seccion del analizador Sintactico =====****---*/

%start inicio

%%

/*---****===== Produccion de inicio de lectura =====****---*/

inicio          : lista_tokens EOF
                {{ 
                    return $1;
                }}
                ;

/*---****===== Produccion del listado de tokens=====****---*/

lista_tokens        : lista_tokens unidad_token
                    {{
                        $1.push($2);
                        $$ = $1;
                    }}
                    | unidad_token
                    {{
                        $$ = [$1];
                    }}
                    ;

/*---****===== Produccion del listado de tokens=====****---*/

unidad_token            : token_individual 
                        {{ 
                            $$ = { 
                                tipo: $1.tipo, 
                                lexema: yytext, 
                                linea: yylineno, 
                                columna: yyleng,
                                indentar: $1.indentar
                            }; 
                        }}
                        ;


/*-----=====----- Mapeo de Tokens para el lenguaje -----=====-----*/

token_individual            : TABLE             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                            | COLUMNS           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                            | DELETE            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                            | IN                {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                            /* Tipos de Datos */
                            | TIPO              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                            /* Literales */
                            | NUMERO            {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                            | STRING            {{ $$ = {tipo: 'CADENA', indentar: 0}; }}
                            | IDENTIFICADOR     {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}

                            /* Operadores Aritmeticos */
                            | MAS               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MENOS             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MULTIPLICACION    {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | DIVISION          {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MODULO            {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                            /* Operadores de Comparacion */
                            | MAYOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MENOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MAYOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | MENOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | IGUALACION        {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | DIFERENTE         {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | IGUAL             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                            /* Operadores Logicos */
                            | OR                {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | AND               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                            | NOT               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                            /* Delimitadores y Puntuacion */
                            | PARENT_APERTURA   {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                            | PARENT_CIERRE     {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                            | CORCHETE_APERTURA {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                            | CORCHETE_CIERRE   {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                            | PUNTO_COMA        {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                            | COMA              {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                            | PUNTO             {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}

                            /* Otros */
                            | COMENTARIO        {{ $$ = {tipo: 'COMENTARIO', indentar: 0}; }}
                            | ESPACIO           {{ $$ = {tipo: 'ESPACIO', indentar: 0}; }}
                            | ERROR_LEXICO      {{ $$ = {tipo: 'ERROR', indentar: 0}; }}
                            ;