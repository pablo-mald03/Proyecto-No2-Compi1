/* Seccion analizador Lexico */

%lex
%options ranges yylineno
%%

/*Espacios y saltos de linea*/

\s+                   return 'ESPACIO';

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*------***---Reconocimiento de colores hexadecimales---***------*/

"#"[0-9A-Fa-f]{6}             return 'HEX_COLOR';
"#"[0-9A-Fa-f]{3}             return 'HEX_COLOR';

/*Apartado de comentarios*/

"#".*                                   return 'COMENTARIO';

"/*"([^*]|\*+[^*/])*(\*+"/")            return 'COMENTARIO';


/*------***---Reconocimiento de presets de direcciones y redondeo---***------*/


"CENTER"|"RIGHT"|"LEFT"         return 'DIRECTION';

"DOTTED"|"LINE"|"DOUBLE"         return 'MARGIN_TIPO';



/*------***---Reconocimiento de presets de tipos de fuente---***------*/


"HELVETICA"         return 'HELVETICA';

"SANS"              return 'SANS';

"SERIF"             return 'SERIF';

"MONO"              return 'MONO';

"CURSIVE"           return 'CURSIVE';


/*------***---Reconocimiento de presets de colores---***------*/


"blue"|"white"|"red"|"green"|"violet"|"gray"|"black"|"lightgray"    return 'COLOR_PRESET';


/*------***--- Reconocimiento de palabras reservadas de direcciones---***------*/

"top"|"bottom"|"left"|"right"       return 'POSITION';


/*------***--- Reconocimiento de palabras reservadas de configuracion general---***------*/

"rgb"                               return 'RGB';

"text"                              return 'TEXT';

"align"                             return 'ALIGN';

"size"                              return 'SIZE';

"font"                              return 'FONT';

"padding"                           return 'PADDING';

"margin"                            return 'MARGIN';

"border"                            return 'BORDER';

"style"                             return 'STYLE';

"radius"                            return 'RADIUS';


/*------***--- Reconocimiento de palabras reservadas de configuracion---***------*/

"height"                            return 'HEIGHT';

"width"                             return 'WIDTH';

"min-height"                        return 'MIN_HEIGHT';

"min-width"                         return 'MIN_WIDTH';

"max-height"                        return 'MAX_HEIGHT';

"max-width"                         return 'MAX_WIDTH';

/*------***--- Reconocimiento de palabras reservadas de configuracion de colores---***------*/

"background"                        return 'BACKGROUND';

"color"                             return 'COLOR';

/*------***--- Reconocimiento de caracteres especiales---***------*/

","                         return 'COMA';

";"                         return 'PUNTO_COMA';

"{"                         return 'LLAVE_APERTURA';

"}"                         return 'LLAVE_CIERRE';

"("                         return 'PARENT_APERTURA';

")"                         return 'PARENT_CIERRE';

"="                         return 'IGUAL';

/*------***--- Reconocimiento de operadores matematicos---***------*/

"+"                     return 'MAS';

"-"                     return 'MENOS';

"*"                     return 'MULTIPLICACION';

"/"                     return 'DIVISION';

/*---Caracter especial para indicar espacio----*/

"%"                     return 'PORCENTAJE';

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

/*------***--- Reconocimiento de palabras reservadas del lenguaje---***------*/

"extends"                   return 'EXTENDS';

"@for"                      return 'FOR';

"from"                      return 'FROM';              

"through"                   return 'THROUGH';    

"to"                        return 'TO';    


/*------***--- Reconocimiento de numeros decimales y enteros---***------*/

[0-9]+(\.[0-9]+)?\b             return 'NUMERO';



/*------***--- Reconocimiento de variables---***------*/

"$"[a-zA-Z_][a-zA-Z0-9_-]*      return 'VARIABLE_DOLAR';


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

/*-----=====----- Mapeo de Tokens para el Linter -----=====-----*/

token_individual    : NUMERO            {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | HEX_COLOR         {{ $$ = {tipo: 'COLOR_HEX', indentar: 0}; }}
                    | COLOR_PRESET      {{ $$ = {tipo: 'COLOR_RESERVADO', indentar: 0}; }}
                    | VARIABLE_DOLAR    {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}
                    | IDENTIFICADOR     {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}

                    /* Palabras Reservadas de Estructura */
                    | EXTENDS           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FOR               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FROM              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | THROUGH           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | TO                {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                    /* Propiedades de Configuracion */
                    | BACKGROUND        {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | COLOR             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | HEIGHT            {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | WIDTH             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | MIN_HEIGHT        {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | MIN_WIDTH         {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | MAX_HEIGHT        {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | MAX_WIDTH         {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | TEXT              {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | ALIGN             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | SIZE              {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | FONT              {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | PADDING           {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | MARGIN            {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | BORDER            {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | STYLE             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | RADIUS            {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | RGB               {{ $$ = {tipo: 'FUNCION_COLOR', indentar: 0}; }}

                    /* Presets y Enums */
                    | DIRECTION         {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | MARGIN_TIPO       {{ $$ = {tipo: 'PRESET', indentar: 0}; }}
                    | POSITION          {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | HELVETICA         {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | SANS              {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | SERIF             {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | MONO              {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | CURSIVE           {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}

                    /* Delimitadores e Indentacion */
                    | LLAVE_APERTURA    {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }}
                    | LLAVE_CIERRE      {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }}
                    | PARENT_APERTURA   {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                    | PARENT_CIERRE     {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                    | COMA              {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                    | PUNTO_COMA        {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                    | IGUAL             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | PORCENTAJE        {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                    /* Operadores Logicos y Matematicos */
                    | MAS               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOS             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MULTIPLICACION    {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | DIVISION          {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MAYOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MAYOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | IGUALACION        {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | DIFERENTE         {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | OR                {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | AND               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | NOT               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                    /* Otros */
                    | COMENTARIO        {{ $$ = {tipo: 'COMENTARIO', indentar: 0}; }}
                    | ESPACIO           {{ $$ = {tipo: 'ESPACIO', indentar: 0}; }}
                    | ERROR_LEXICO      {{ $$ = {tipo: 'ERROR', indentar: 0}; }}
                    ;

