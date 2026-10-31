// Structural subset used by the checker. No consumer dependency on parser typings.
export type HtmlNode =
 | {type:"text";data:string}
 | {type:"comment"|"directive";data:string}
 | {type:"tag"|"script"|"style";name:string;attribs:Record<string,string>;children:HtmlNode[]};
export function parseDocument(html:string,options?:{decodeEntities?:boolean;lowerCaseAttributeNames?:boolean;lowerCaseTags?:boolean}):{children:HtmlNode[]};
