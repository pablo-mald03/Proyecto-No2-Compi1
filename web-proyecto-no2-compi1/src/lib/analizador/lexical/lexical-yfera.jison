/* Seccion analizador Lexico */

%lex
%options ranges yylineno

/*------***---Estado de strings---***------*/
%x string

%x backstring

%%

/*Espacios y saltos de linea*/

\s+                   return 'ESPACIO';

[\u200B\uFEFF\u200E\u200F\u202A-\u202E]+ /* Ignorar caracteres basura */

/*Apartado de comentarios*/

"#".*                                   return 'COMENTARIO';

"/*"([^*]|\*+[^*/])*(\*+"/")            return 'COMENTARIO';

/*------***---Reconocimiento del ID especial de main---***------*/

"main"                          return 'MAIN';

/*------***---Reconocimiento de tipos de variables---***------*/

"int"                           return 'INT';

"float"                         return 'FLOAT';

"string"                        return 'STRING';

"boolean"                       return 'BOOLEAN';

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

"continue"                      return 'CONTINUE';

"default"                       return 'DEFAULT';

"do"                            return 'DO';

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


/*------***---Reconocimiento de igualacion---***------*/

"="                             return 'IGUAL';

/*------***---Reconocimiento de palabras con contexto especial del lenguaje---***------*/

"import"                            return 'IMPORT';

"execute"                           return 'EXECUTE';

"load"                              return 'LOAD';

/*------***---Reconocimiento de valores de variables---***------*/

[0-9]+"."[0-9]+\b               return 'DECIMAL';

[0-9]+\b                        return 'ENTERO';

[a-zA-Z][a-zA-Z0-9_]*           return 'IDENTIFICADOR';

"@"[a-zA-Z][a-zA-Z0-9_]*        return 'ARROBA_VAR';

// Para caracteres escapados
"'"('\\'.)"'"                   return 'VALOR_CHAR'; 

"'"."'"                         return 'VALOR_CHAR';


/*------***---Reconocimiento de valores de String---***------*/

"\""                    { this.begin('string'); return 'COMILLA'; }

<string>"\""            { this.popState(); return 'COMILLA'; }

<string>[^"\\\n]+       { return 'TEXTO_PLANO'; }
<string>"\\\""          { return 'TEXTO_PLANO'; } 
<string>"\\\\"          { return 'TEXTO_PLANO'; } 

<string>\n              { 
    this.popState(); 
    return 'ERROR_STRING_NO_CERRADO'; 
}


"`"                     { this.begin('backstring'); return 'BACKTICK'; }

/* --- Reglas DENTRO del estado backstring --- */

<backstring>"$"[a-zA-Z][a-zA-Z0-9_]* { 
    yytext = yytext.slice(1); 
    return 'VAR_INTERPOLADA'; 
}

<backstring>[^`$]+       { return 'TEXTO_BACKSTRING'; }

<backstring>"\\$"        { return 'TEXTO_BACKSTRING'; }

<backstring>"`"          { this.popState(); return 'BACKTICK'; }

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


/*-----=====----- Mapeo Total de Tokens -----=====-----*/

token_individual        : MAIN              {{ $$ = {tipo: 'MAIN', indentar: 0}; }}
                        | INT               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | FLOAT             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | STRING            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | BOOLEAN           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | CHAR              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | FUNCTION          {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                        /* Comandos de Contexto Especial */
                        | IMPORT            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | EXECUTE           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | LOAD              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                        /* Estructuras de Control */
                        | WHILE             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | FOR               {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | IF                {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | ELSE              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | SWITCH            {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | CASE              {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | BREAK             {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | CONTINUE          {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | DEFAULT           {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}
                        | DO                {{ $$ = {tipo: 'RESERVADA', indentar: 0}; }}

                        /* Valores Booleanos */
                        | TRUE              {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                        | FALSE             {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}

                        /* Delimitadores y Agrupaciones*/
                        | LLAVE_APERTURA    {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }} 
                        | LLAVE_CIERRE      {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }} 
                        | CORCHETE_APERTURA {{ $$ = {tipo: 'DELIMITADOR', indentar: 1}; }}
                        | CORCHETE_CIERRE   {{ $$ = {tipo: 'DELIMITADOR', indentar: -1}; }}
                        | PARENT_APERTURA   {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}
                        | PARENT_CIERRE     {{ $$ = {tipo: 'DELIMITADOR', indentar: 0}; }}

                        /* Signos de Puntuacion */
                        | COMA              {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                        | PUNTO_COMA        {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}
                        | DOS_PUNTOS        {{ $$ = {tipo: 'PUNTUACION', indentar: 0}; }}

                        /* Operadores Aritmeticos */
                        | MAS               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MENOS             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MULTIPLICACION    {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | DIVISION          {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MODULO            {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                        /* Operadores de Comparacion y Logicos */
                        | MAYOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MENOR_IGUAL       {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MAYOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | MENOR             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | IGUALACION        {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | DIFERENTE         {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | IGUAL             {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | OR                {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | AND               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}
                        | NOT               {{ $$ = {tipo: 'OPERADOR', indentar: 0}; }}

                        /* Variables, Identificadores y Literales Numericos */
                        | IDENTIFICADOR     {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}
                        | ARROBA_VAR        {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                        | ENTERO            {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                        | DECIMAL           {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}
                        | VALOR_CHAR        {{ $$ = {tipo: 'LITERAL', indentar: 0}; }}

                        /* Manejo de Strings e Interpolación */
                        | COMILLA                   {{ $$ = {tipo: 'CADENA', indentar: 0}; }}
                        | TEXTO_PLANO               {{ $$ = {tipo: 'CADENA', indentar: 0}; }}
                        | BACKTICK                  {{ $$ = {tipo: 'CADENA_INTERPOLACION', indentar: 0}; }}
                        | VAR_INTERPOLADA           {{ $$ = {tipo: 'IDENTIFICADOR', indentar: 0}; }}
                        | TEXTO_BACKSTRING          {{ $$ = {tipo: 'CADENA_INTERPOLACION', indentar: 0}; }}

                        /* Elementos Estructurales e Ignorados */
                        | COMENTARIO        {{ $$ = {tipo: 'COMENTARIO', indentar: 0}; }}
                        | ESPACIO           {{ $$ = {tipo: 'ESPACIO', indentar: 0}; }}

                        /* Errores */
                        | ERROR_LEXICO                  {{ $$ = {tipo: 'ERROR', indentar: 0}; }}
                        | ERROR_STRING_NO_CERRADO       {{ $$ = {tipo: 'ERROR', indentar: 0}; }}
                        ;