/**
 * Data - languages
 */
interface Language {
    iso639_1: string;
    iso639_2: string;
    iso639_3: string;
    name: string;
    nameLocal: string;
    ietf: string;
    ietfRegions: Record<string, string>;
    lcid: number;
    speakers: number;
}
declare const languages: Language[];
export default languages;
//# sourceMappingURL=languages.d.ts.map