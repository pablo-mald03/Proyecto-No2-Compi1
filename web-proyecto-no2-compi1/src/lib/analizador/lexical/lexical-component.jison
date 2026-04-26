/* Seccion analizador Lexico */

%lex
%options ranges yylineno

%x string
%s interp

%%

/*Espacios y saltos de linea*/

\s+                   return 'ESPACIO';

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*                                   return 'COMENTARIO';

"/*"([^*]|\*+[^*/])*(\*+"/")            return 'COMENTARIO';


/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

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

"[["                        return 'CORCHETE_DOBLE_APERTURA';

"]]"                        return 'CORCHETE_DOBLE_CIERRE';

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

"$"[a-zA-Z_][a-zA-Z0-9_]*       return 'VARIABLE_DOLAR';

[a-zA-Z][a-zA-Z0-9_]*           return 'IDENTIFICADOR';

"@"[a-zA-Z][a-zA-Z0-9_]*        return 'ARROBA_VAR';


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

/*---****===== Produccion de cada token reconocido=====****---*/

token_individual    : INT               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FLOAT             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | STRING            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | BOOLEAN           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | CHAR              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FUNCTION          {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FOR               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | EACH              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | TRACK             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | EMPTY             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | IF                {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | ELSE              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | SWITCH            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | CASE              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | DEFAULT           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                
                    /* Componentes */
                    | TEXT              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | IMG               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | FORM              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | INPUT_TEXT        {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | INPUT_NUMBER      {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | INPUT_BOOL        {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                    | SUBMIT            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                
                    /* Propiedades y Valores Booleanos */
                    | LABEL             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | ID                {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | VALUE             {{ $$ = {tipo: 'PROPIEDAD', indentar: 0}; }}
                    | TRUE              {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | FALSE             {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                
                    /* Delimitadores y Agrupaciones */
                    | LLAVE_APERTURA            {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }} 
                    | LLAVE_CIERRE              {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }} 
                    | CORCHETE_DOBLE_APERTURA   {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }}
                    | CORCHETE_DOBLE_CIERRE     {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }}
                    | CORCHETE_APERTURA         {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }}
                    | CORCHETE_CIERRE           {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }}
                    | PARENT_APERTURA           {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }} 
                    | PARENT_CIERRE             {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                
                    /* Signos de Puntuación */
                    | COMA              {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                    | DOS_PUNTOS        {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                
                    /* Operadores Matematicos */
                    | MAS               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOS             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MULTIPLICACION    {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | DIVISION          {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MODULO            {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                
                    /* Operadores de Comparacion y Lógicos */
                    | MAYOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MAYOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | MENOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | IGUALACION        {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | DIFERENTE         {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | OR                {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | AND               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                    | NOT               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                
                    /* Variables y Literales Numericos */
                    | VARIABLE_DOLAR    {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}
                    | ARROBA_VAR        {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | IDENTIFICADOR     {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}
                    | ENTERO            {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                    | DECIMAL           {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                
                    /* Manejo de Strings e Interpolacion */
                    | COMILLA           {{ $$ = {tipo: 'CADENA', indentar: 0}; }}
                    | BACKTICK          {{ $$ = {tipo: 'CADENA_INTERPOLACION', indentar: 0}; }}
                    | TEXTO_CADENA      {{ $$ = {tipo: 'CADENA', indentar: 0}; }}
                
                    /* Elementos Estructurales e Ignorados */
                    | COMENTARIO        {{ $$ = {tipo: 'COMENTARIO', indentar: 0}; }}
                    | ESPACIO           {{ $$ = {tipo: 'ESPACIO', indentar: 0}; }}
                    
                    /* Errores */
                    | ERROR_LEXICO      
                    {{ $$ = {tipo: 'ERROR', indentar: 0}; }}
                    ;
                