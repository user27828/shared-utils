/**
 * Data - languages
 */
const languages = [
  // Special "Not Selected" entry always first
  {
    iso639_1: "",
    iso639_2: "",
    iso639_3: "",
    name: "Not Selected/Other",
    nameLocal: "Not Selected/Other",
    ietf: "",
    ietfRegions: {},
    lcid: 0,
    speakers: 0, // In millions
  },
  // The rest of the languages sorted alphabetically by name
  {
    iso639_1: "aa",
    iso639_2: "aar",
    iso639_3: "aar",
    name: "Afar",
    nameLocal: "Qafar",
    ietf: "aa",
    ietfRegions: {
      DJ: "aa-DJ", // Djibouti
      ER: "aa-ER", // Eritrea
      ET: "aa-ET", // Ethiopia
    },
    lcid: 1147,
    speakers: 1.5,
  },
  {
    iso639_1: "af",
    iso639_2: "afr",
    iso639_3: "afr",
    name: "Afrikaans",
    nameLocal: "Afrikaans",
    ietf: "af",
    ietfRegions: {
      ZA: "af-ZA", // South Africa
    },
    lcid: 1078,
    speakers: 7,
  },
  {
    iso639_1: "ak",
    iso639_2: "aka",
    iso639_3: "aka",
    name: "Akan",
    nameLocal: "Akan",
    ietf: "ak",
    ietfRegions: {
      GH: "ak-GH", // Ghana
    },
    lcid: 1164,
    speakers: 11,
  },
  {
    iso639_1: "sq",
    iso639_2: "sqi",
    iso639_3: "sqi",
    name: "Albanian",
    nameLocal: "Shqip",
    ietf: "sq",
    ietfRegions: {
      AL: "sq-AL", // Albania
    },
    lcid: 1052,
    speakers: 7.5,
  },
  {
    iso639_1: "",
    iso639_2: "alz",
    iso639_3: "alz",
    name: "Alur",
    nameLocal: "Alur",
    ietf: "alz",
    ietfRegions: {
      UG: "alz-UG", // Uganda
      CD: "alz-CD", // Democratic Republic of Congo
    },
    lcid: 0,
    speakers: 2.1,
  },
  {
    iso639_1: "am",
    iso639_2: "amh",
    iso639_3: "amh",
    name: "Amharic",
    nameLocal: "አማርኛ",
    ietf: "am",
    ietfRegions: {
      ET: "am-ET", // Ethiopia
    },
    lcid: 1118,
    speakers: 29,
  },
  {
    iso639_1: "ar",
    iso639_2: "ara",
    iso639_3: "ara",
    name: "Arabic",
    nameLocal: "العربية",
    ietf: "ar",
    ietfRegions: {
      SA: "ar-SA", // Saudi Arabia
      EG: "ar-EG", // Egypt
      DZ: "ar-DZ", // Algeria
      MA: "ar-MA", // Morocco
      LB: "ar-LB", // Lebanon
    },
    lcid: 1025, // Microsoft LCID for ar-SA
    speakers: 315,
  },
  {
    iso639_1: "hy",
    iso639_2: "hye",
    iso639_3: "hye",
    name: "Armenian",
    nameLocal: "Հայերեն",
    ietf: "hy",
    ietfRegions: {
      AM: "hy-AM", // Armenia
    },
    lcid: 1067,
    speakers: 7,
  },
  {
    iso639_1: "as",
    iso639_2: "asm",
    iso639_3: "asm",
    name: "Assamese",
    nameLocal: "অসমীয়া",
    ietf: "as",
    ietfRegions: {
      IN: "as-IN", // India
    },
    lcid: 1101,
    speakers: 15,
  },
  {
    iso639_1: "az",
    iso639_2: "aze",
    iso639_3: "aze",
    name: "Azerbaijani",
    nameLocal: "Azərbaycan",
    ietf: "az",
    ietfRegions: {
      AZ: "az-AZ", // Azerbaijan
    },
    lcid: 1068,
    speakers: 23,
  },
  {
    iso639_1: "ay",
    iso639_2: "aym",
    iso639_3: "aym",
    name: "Aymara",
    nameLocal: "Aymar aru",
    ietf: "ay",
    ietfRegions: {
      BO: "ay-BO", // Bolivia
      PE: "ay-PE", // Peru
    },
    lcid: 1132,
    speakers: 2.2,
  },
  {
    iso639_1: "bm",
    iso639_2: "bam",
    iso639_3: "bam",
    name: "Bambara",
    nameLocal: "Bamanankan",
    ietf: "bm",
    ietfRegions: {
      ML: "bm-ML", // Mali
    },
    lcid: 1165,
    speakers: 14,
  },
  {
    iso639_1: "ba",
    iso639_2: "bak",
    iso639_3: "bak",
    name: "Bashkir",
    nameLocal: "Башҡортса",
    ietf: "ba",
    ietfRegions: {
      RU: "ba-RU", // Russia
    },
    lcid: 1145,
    speakers: 1.4,
  },
  {
    iso639_1: "eu",
    iso639_2: "eus",
    iso639_3: "eus",
    name: "Basque",
    nameLocal: "Euskara",
    ietf: "eu",
    ietfRegions: {
      ES: "eu-ES", // Spain
    },
    lcid: 1069,
    speakers: 1,
  },
  {
    iso639_1: "be",
    iso639_2: "bel",
    iso639_3: "bel",
    name: "Belarusian",
    nameLocal: "Беларуская",
    ietf: "be",
    ietfRegions: {
      BY: "be-BY", // Belarus
    },
    lcid: 1059,
    speakers: 10,
  },
  {
    iso639_1: "bn",
    iso639_2: "ben",
    iso639_3: "ben",
    name: "Bengali",
    nameLocal: "বাংলা",
    ietf: "bn",
    ietfRegions: {
      BD: "bn-BD", // Bangladesh
      IN: "bn-IN", // India
    },
    lcid: 2117,
    speakers: 228,
  },
  {
    iso639_1: "",
    iso639_2: "bem",
    iso639_3: "bem",
    name: "Bemba",
    nameLocal: "Ichibemba",
    ietf: "bem",
    ietfRegions: {
      ZM: "bem-ZM", // Zambia
    },
    lcid: 0,
    speakers: 4.1,
  },
  {
    iso639_1: "bho",
    iso639_2: "bho",
    iso639_3: "bho",
    name: "Bhojpuri",
    nameLocal: "भोजपुरी",
    ietf: "bho",
    ietfRegions: {
      IN: "bho-IN", // India
      NP: "bho-NP", // Nepal
    },
    lcid: 1142,
    speakers: 52,
  },
  {
    iso639_1: "bs",
    iso639_2: "bos",
    iso639_3: "bos",
    name: "Bosnian",
    nameLocal: "Bosanski",
    ietf: "bs",
    ietfRegions: {
      BA: "bs-BA", // Bosnia and Herzegovina
    },
    lcid: 5146,
    speakers: 2,
  },
  {
    iso639_1: "br",
    iso639_2: "bre",
    iso639_3: "bre",
    name: "Breton",
    nameLocal: "Brezhoneg",
    ietf: "br",
    ietfRegions: {
      FR: "br-FR", // France
    },
    lcid: 1155,
    speakers: 0.21,
  },
  {
    iso639_1: "bg",
    iso639_2: "bul",
    iso639_3: "bul",
    name: "Bulgarian",
    nameLocal: "Български",
    ietf: "bg",
    ietfRegions: {
      BG: "bg-BG", // Bulgaria
    },
    lcid: 1026,
    speakers: 9,
  },
  {
    iso639_1: "my",
    iso639_2: "mya",
    iso639_3: "mya",
    name: "Burmese",
    nameLocal: "မြန်မာဘာသာ",
    ietf: "my",
    ietfRegions: {
      MM: "my-MM", // Myanmar
    },
    lcid: 1109,
    speakers: 33,
  },
  {
    iso639_1: "ca",
    iso639_2: "cat",
    iso639_3: "cat",
    name: "Catalan",
    nameLocal: "Català",
    ietf: "ca",
    ietfRegions: {
      ES: "ca-ES", // Spain
    },
    lcid: 1027,
    speakers: 10,
  },
  {
    iso639_1: "ceb",
    iso639_2: "ceb",
    iso639_3: "ceb",
    name: "Cebuano",
    nameLocal: "Cebuano",
    ietf: "ceb",
    ietfRegions: {
      PH: "ceb-PH", // Philippines
    },
    lcid: 1140,
    speakers: 17,
  },
  {
    iso639_1: "ny",
    iso639_2: "nya",
    iso639_3: "nya",
    name: "Chichewa",
    nameLocal: "Chichewa",
    ietf: "ny",
    ietfRegions: {
      MW: "ny-MW", // Malawi
    },
    lcid: 1156,
    speakers: 12,
  },
  {
    iso639_1: "zh",
    iso639_2: "zho",
    iso639_3: "zho",
    name: "Chinese (Mandarin)",
    nameLocal: "中文",
    ietf: "zh",
    ietfRegions: {
      CN: "zh-CN", // Simplified Chinese (Mainland China)
      TW: "zh-TW", // Traditional Chinese (Taiwan)
      HK: "zh-HK", // Traditional Chinese (Hong Kong)
      SG: "zh-SG", // Simplified Chinese (Singapore)
    },
    lcid: 2052, // Microsoft LCID for zh-CN
    speakers: 1100,
  },
  {
    iso639_1: "",
    iso639_2: "ctg",
    iso639_3: "ctg",
    name: "Chittagonian",
    nameLocal: "চাটগাঁইয়া",
    ietf: "ctg",
    ietfRegions: {
      BD: "ctg-BD", // Bangladesh
    },
    lcid: 0,
    speakers: 16,
  },
  {
    iso639_1: "cjy",
    iso639_2: "cjy",
    iso639_3: "cjy",
    name: "Jin Chinese",
    nameLocal: "晉語",
    ietf: "cjy",
    ietfRegions: {
      CN: "cjy-CN", // China
    },
    lcid: 3076,
    speakers: 63,
  },
  {
    iso639_1: "co",
    iso639_2: "cos",
    iso639_3: "cos",
    name: "Corsican",
    nameLocal: "Corsu",
    ietf: "co",
    ietfRegions: {
      FR: "co-FR", // France
    },
    lcid: 1154,
    speakers: 0.15,
  },
  {
    iso639_1: "",
    iso639_2: "cre",
    iso639_3: "cre",
    name: "Cree",
    nameLocal: "ᓀᐦᐃᔭᐍᐏᐣ",
    ietf: "cre",
    ietfRegions: {
      CA: "cre-CA", // Canada
    },
    lcid: 0,
    speakers: 0.117,
  },
  {
    iso639_1: "hr",
    iso639_2: "hrv",
    iso639_3: "hrv",
    name: "Croatian",
    nameLocal: "Hrvatski",
    ietf: "hr",
    ietfRegions: {
      HR: "hr-HR", // Croatia
    },
    lcid: 1050,
    speakers: 7,
  },
  {
    iso639_1: "cs",
    iso639_2: "ces",
    iso639_3: "ces",
    name: "Czech",
    nameLocal: "Čeština",
    ietf: "cs",
    ietfRegions: {
      CZ: "cs-CZ", // Czech Republic
    },
    lcid: 1029,
    speakers: 11,
  },
  {
    iso639_1: "da",
    iso639_2: "dan",
    iso639_3: "dan",
    name: "Danish",
    nameLocal: "Dansk",
    ietf: "da",
    ietfRegions: {
      DK: "da-DK", // Denmark
    },
    lcid: 1030,
    speakers: 6,
  },
  {
    iso639_1: "dv",
    iso639_2: "div",
    iso639_3: "div",
    name: "Dhivehi",
    nameLocal: "ދިވެހި",
    ietf: "dv",
    ietfRegions: {
      MV: "dv-MV", // Maldives
    },
    lcid: 1150,
    speakers: 0.3,
  },
  {
    iso639_1: "nl",
    iso639_2: "nld",
    iso639_3: "nld",
    name: "Dutch",
    nameLocal: "Nederlands",
    ietf: "nl",
    ietfRegions: {
      NL: "nl-NL", // Netherlands
      BE: "nl-BE", // Belgium
    },
    lcid: 1043,
    speakers: 30,
  },
  {
    iso639_1: "dz",
    iso639_2: "dzo",
    iso639_3: "dzo",
    name: "Dzongkha",
    nameLocal: "རྫོང་ཁ",
    ietf: "dz",
    ietfRegions: {
      BT: "dz-BT", // Bhutan
    },
    lcid: 1168,
    speakers: 0.7,
  },
  {
    iso639_1: "efi",
    iso639_2: "efi",
    iso639_3: "efi",
    name: "Efik",
    nameLocal: "Efik",
    ietf: "efi",
    ietfRegions: {
      NG: "efi-NG", // Nigeria
    },
    lcid: 1182,
    speakers: 0.4,
  },
  {
    iso639_1: "en",
    iso639_2: "eng",
    iso639_3: "eng",
    name: "English",
    nameLocal: "English",
    ietf: "en",
    ietfRegions: {
      US: "en-US", // United States
      GB: "en-GB", // United Kingdom
      CA: "en-CA", // Canada
      AU: "en-AU", // Australia
      IN: "en-IN", // India
    },
    lcid: 1033, // Microsoft LCID for en-US
    speakers: 379,
  },
  {
    iso639_1: "et",
    iso639_2: "est",
    iso639_3: "est",
    name: "Estonian",
    nameLocal: "Eesti",
    ietf: "et",
    ietfRegions: {
      EE: "et-EE", // Estonia
    },
    lcid: 1061,
    speakers: 1,
  },
  {
    iso639_1: "eo",
    iso639_2: "epo",
    iso639_3: "epo",
    name: "Esperanto",
    nameLocal: "Esperanto",
    ietf: "eo",
    ietfRegions: {},
    lcid: 1143,
    speakers: 2,
  },
  {
    iso639_1: "ee",
    iso639_2: "ewe",
    iso639_3: "ewe",
    name: "Ewe",
    nameLocal: "Eʋegbe",
    ietf: "ee",
    ietfRegions: {
      GH: "ee-GH", // Ghana
      TG: "ee-TG", // Togo
    },
    lcid: 1166,
    speakers: 5,
  },
  {
    iso639_1: "fo",
    iso639_2: "fao",
    iso639_3: "fao",
    name: "Faroese",
    nameLocal: "Føroyskt",
    ietf: "fo",
    ietfRegions: {
      FO: "fo-FO", // Faroe Islands
    },
    lcid: 1080,
    speakers: 0.066,
  },
  {
    iso639_1: "",
    iso639_2: "fon",
    iso639_3: "fon",
    name: "Fon",
    nameLocal: "Fɔngbe",
    ietf: "fon",
    ietfRegions: {
      BJ: "fon-BJ", // Benin
    },
    lcid: 0,
    speakers: 2.2,
  },
  {
    iso639_1: "ff",
    iso639_2: "ful",
    iso639_3: "ful",
    name: "Fula",
    nameLocal: "Fulfulde",
    ietf: "ff",
    ietfRegions: {
      SN: "ff-SN", // Senegal
      GN: "ff-GN", // Guinea
      MR: "ff-MR", // Mauritania
    },
    lcid: 1167,
    speakers: 24,
  },
  {
    iso639_1: "",
    iso639_2: "gan",
    iso639_3: "gan",
    name: "Gan Chinese",
    nameLocal: "贛語",
    ietf: "gan",
    ietfRegions: {
      CN: "gan-CN", // China
    },
    lcid: 0,
    speakers: 22,
  },
  {
    iso639_1: "gl",
    iso639_2: "glg",
    iso639_3: "glg",
    name: "Galician",
    nameLocal: "Galego",
    ietf: "gl",
    ietfRegions: {
      ES: "gl-ES", // Spain
    },
    lcid: 1110,
    speakers: 2.4,
  },
  {
    iso639_1: "",
    iso639_2: "lug",
    iso639_3: "lug",
    name: "Ganda",
    nameLocal: "Luganda",
    ietf: "lug",
    ietfRegions: {
      UG: "lug-UG", // Uganda
    },
    lcid: 0,
    speakers: 5.6,
  },
  {
    iso639_1: "ka",
    iso639_2: "kat",
    iso639_3: "kat",
    name: "Georgian",
    nameLocal: "ქართული",
    ietf: "ka",
    ietfRegions: {
      GE: "ka-GE", // Georgia
    },
    lcid: 1079,
    speakers: 4,
  },
  {
    iso639_1: "de",
    iso639_2: "deu",
    iso639_3: "deu",
    name: "German",
    nameLocal: "Deutsch",
    ietf: "de",
    ietfRegions: {
      DE: "de-DE", // Germany
      AT: "de-AT", // Austria
      CH: "de-CH", // Switzerland
    },
    lcid: 1031,
    speakers: 100,
  },
  {
    iso639_1: "",
    iso639_2: "kik",
    iso639_3: "kik",
    name: "Gikuyu",
    nameLocal: "Gĩkũyũ",
    ietf: "kik",
    ietfRegions: {
      KE: "kik-KE", // Kenya
    },
    lcid: 0,
    speakers: 8.1,
  },
  {
    iso639_1: "el",
    iso639_2: "ell",
    iso639_3: "ell",
    name: "Greek",
    nameLocal: "Ελληνικά",
    ietf: "el",
    ietfRegions: {
      GR: "el-GR", // Greece
      CY: "el-CY", // Cyprus
    },
    lcid: 1032,
    speakers: 13,
  },
  {
    iso639_1: "kl",
    iso639_2: "kal",
    iso639_3: "kal",
    name: "Greenlandic",
    nameLocal: "Kalaallisut",
    ietf: "kl",
    ietfRegions: {
      GL: "kl-GL", // Greenland
    },
    lcid: 1135,
    speakers: 0.057,
  },
  {
    iso639_1: "gn",
    iso639_2: "grn",
    iso639_3: "grn",
    name: "Guarani",
    nameLocal: "Avañe'ẽ",
    ietf: "gn",
    ietfRegions: {
      PY: "gn-PY", // Paraguay
    },
    lcid: 1140,
    speakers: 6.5,
  },
  {
    iso639_1: "gu",
    iso639_2: "guj",
    iso639_3: "guj",
    name: "Gujarati",
    nameLocal: "ગુજરાતી",
    ietf: "gu",
    ietfRegions: {
      IN: "gu-IN", // India
    },
    lcid: 1095,
    speakers: 50,
  },
  {
    iso639_1: "ht",
    iso639_2: "hat",
    iso639_3: "hat",
    name: "Haitian Creole",
    nameLocal: "Kreyòl Ayisyen",
    ietf: "ht",
    ietfRegions: {
      HT: "ht-HT", // Haiti
    },
    lcid: 1164,
    speakers: 10,
  },
  {
    iso639_1: "",
    iso639_2: "hak",
    iso639_3: "hak",
    name: "Hakka Chinese",
    nameLocal: "客家語",
    ietf: "hak",
    ietfRegions: {
      CN: "hak-CN", // China
      TW: "hak-TW", // Taiwan
    },
    lcid: 0,
    speakers: 48,
  },
  {
    iso639_1: "ha",
    iso639_2: "hau",
    iso639_3: "hau",
    name: "Hausa",
    nameLocal: "هَوُسَ",
    ietf: "ha",
    ietfRegions: {
      NG: "ha-NG", // Nigeria
      NE: "ha-NE", // Niger
      GH: "ha-GH", // Ghana
    },
    lcid: 1128,
    speakers: 25,
  },
  {
    iso639_1: "he",
    iso639_2: "heb",
    iso639_3: "heb",
    name: "Hebrew",
    nameLocal: "עברית",
    ietf: "he",
    ietfRegions: {
      IL: "he-IL", // Israel
    },
    lcid: 1037,
    speakers: 9,
  },
  {
    iso639_1: "hi",
    iso639_2: "hin",
    iso639_3: "hin",
    name: "Hindi",
    nameLocal: "हिन्दी",
    ietf: "hi",
    ietfRegions: {
      IN: "hi-IN", // India
    },
    lcid: 1081,
    speakers: 341,
  },
  {
    iso639_1: "hmn",
    iso639_2: "hmn",
    iso639_3: "hmn",
    name: "Hmong",
    nameLocal: "Hmoob",
    ietf: "hmn",
    ietfRegions: {
      CN: "hmn-CN", // China
      VN: "hmn-VN", // Vietnam
      LA: "hmn-LA", // Laos
    },
    lcid: 1149,
    speakers: 4,
  },
  {
    iso639_1: "hu",
    iso639_2: "hun",
    iso639_3: "hun",
    name: "Hungarian",
    nameLocal: "Magyar",
    ietf: "hu",
    ietfRegions: {
      HU: "hu-HU", // Hungary
    },
    lcid: 1038,
    speakers: 13,
  },
  {
    iso639_1: "is",
    iso639_2: "isl",
    iso639_3: "isl",
    name: "Icelandic",
    nameLocal: "Íslenska",
    ietf: "is",
    ietfRegions: {
      IS: "is-IS", // Iceland
    },
    lcid: 1039,
    speakers: 0.3,
  },
  {
    iso639_1: "ig",
    iso639_2: "ibo",
    iso639_3: "ibo",
    name: "Igbo",
    nameLocal: "Asụsụ Igbo",
    ietf: "ig",
    ietfRegions: {
      NG: "ig-NG", // Nigeria
    },
    lcid: 1136,
    speakers: 24,
  },
  {
    iso639_1: "",
    iso639_2: "ilo",
    iso639_3: "ilo",
    name: "Ilocano",
    nameLocal: "Iloko",
    ietf: "ilo",
    ietfRegions: {
      PH: "ilo-PH", // Philippines
    },
    lcid: 0,
    speakers: 10,
  },
  {
    iso639_1: "id",
    iso639_2: "ind",
    iso639_3: "ind",
    name: "Indonesian",
    nameLocal: "Bahasa Indonesia",
    ietf: "id",
    ietfRegions: {
      ID: "id-ID", // Indonesia
    },
    lcid: 1057,
    speakers: 23,
  },
  {
    iso639_1: "iu",
    iso639_2: "iku",
    iso639_3: "iku",
    name: "Inuktitut",
    nameLocal: "ᐃᓄᒃᑎᑐᑦ",
    ietf: "iu",
    ietfRegions: {
      CA: "iu-CA", // Canada
    },
    lcid: 1136,
    speakers: 0.035,
  },
  {
    iso639_1: "ga",
    iso639_2: "gle",
    iso639_3: "gle",
    name: "Irish",
    nameLocal: "Gaeilge",
    ietf: "ga",
    ietfRegions: {
      IE: "ga-IE", // Ireland
    },
    lcid: 2108,
    speakers: 1,
  },
  {
    iso639_1: "isi",
    iso639_2: "isi",
    iso639_3: "isi",
    name: "Inupiaq",
    nameLocal: "Iñupiaq",
    ietf: "isi",
    ietfRegions: {
      US: "isi-US", // United States (Alaska)
    },
    lcid: 1183,
    speakers: 0.003,
  },
  {
    iso639_1: "it",
    iso639_2: "ita",
    iso639_3: "ita",
    name: "Italian",
    nameLocal: "Italiano",
    ietf: "it",
    ietfRegions: {
      IT: "it-IT", // Italy
      CH: "it-CH", // Switzerland
    },
    lcid: 1040,
    speakers: 65,
  },
  {
    iso639_1: "ja",
    iso639_2: "jpn",
    iso639_3: "jpn",
    name: "Japanese",
    nameLocal: "日本語",
    ietf: "ja",
    ietfRegions: {
      JP: "ja-JP", // Japan
    },
    lcid: 1041,
    speakers: 128,
  },
  {
    iso639_1: "jv",
    iso639_2: "jav",
    iso639_3: "jav",
    name: "Javanese",
    nameLocal: "Basa Jawa",
    ietf: "jv",
    ietfRegions: {
      ID: "jv-ID", // Indonesia
    },
    lcid: 1121,
    speakers: 82,
  },
  {
    iso639_1: "kn",
    iso639_2: "kan",
    iso639_3: "kan",
    name: "Kannada",
    nameLocal: "ಕನ್ನಡ",
    ietf: "kn",
    ietfRegions: {
      IN: "kn-IN", // India
    },
    lcid: 1099,
    speakers: 40,
  },
  {
    iso639_1: "",
    iso639_2: "kam",
    iso639_3: "kam",
    name: "Kamba",
    nameLocal: "Kikamba",
    ietf: "kam",
    ietfRegions: {
      KE: "kam-KE", // Kenya
    },
    lcid: 0,
    speakers: 4.6,
  },
  {
    iso639_1: "kr",
    iso639_2: "kau",
    iso639_3: "kau",
    name: "Kanuri",
    nameLocal: "Kanuri",
    ietf: "kr",
    ietfRegions: {
      NG: "kr-NG", // Nigeria
    },
    lcid: 1148,
    speakers: 3.2,
  },
  {
    iso639_1: "ks",
    iso639_2: "kas",
    iso639_3: "kas",
    name: "Kashmiri",
    nameLocal: "कॉशुर",
    ietf: "ks",
    ietfRegions: {
      IN: "ks-IN", // India
    },
    lcid: 1158,
    speakers: 5.6,
  },
  {
    iso639_1: "kk",
    iso639_2: "kaz",
    iso639_3: "kaz",
    name: "Kazakh",
    nameLocal: "Қазақ тілі",
    ietf: "kk",
    ietfRegions: {
      KZ: "kk-KZ", // Kazakhstan
    },
    lcid: 1087,
    speakers: 13,
  },
  {
    iso639_1: "km",
    iso639_2: "khm",
    iso639_3: "khm",
    name: "Khmer",
    nameLocal: "ខ្មែរ",
    ietf: "km",
    ietfRegions: {
      KH: "km-KH", // Cambodia
    },
    lcid: 1107,
    speakers: 16,
  },
  {
    iso639_1: "ko",
    iso639_2: "kor",
    iso639_3: "kor",
    name: "Korean",
    nameLocal: "한국어",
    ietf: "ko",
    ietfRegions: {
      KR: "ko-KR", // South Korea
      KP: "ko-KP", // North Korea
    },
    lcid: 1042,
    speakers: 77,
  },
  {
    iso639_1: "kok",
    iso639_2: "kok",
    iso639_3: "kok",
    name: "Konkani",
    nameLocal: "कोंकणी",
    ietf: "kok",
    ietfRegions: {
      IN: "kok-IN", // India
    },
    lcid: 1111,
    speakers: 2.3,
  },
  {
    iso639_1: "ku",
    iso639_2: "kur",
    iso639_3: "kur",
    name: "Kurdish",
    nameLocal: "Kurdî / کوردی",
    ietf: "ku",
    ietfRegions: {
      TR: "ku-TR", // Turkey
      IQ: "ku-IQ", // Iraq
      IR: "ku-IR", // Iran
      SY: "ku-SY", // Syria
    },
    lcid: 1152,
    speakers: 30,
  },
  {
    iso639_1: "ky",
    iso639_2: "kir",
    iso639_3: "kir",
    name: "Kyrgyz",
    nameLocal: "Кыргызча",
    ietf: "ky",
    ietfRegions: {
      KG: "ky-KG", // Kyrgyzstan
    },
    lcid: 1088,
    speakers: 4.5,
  },
  {
    iso639_1: "lg",
    iso639_2: "lug",
    iso639_3: "lug",
    name: "Luganda",
    nameLocal: "Luganda",
    ietf: "lg",
    ietfRegions: {
      UG: "lg-UG", // Uganda
    },
    lcid: 1157,
    speakers: 6.5,
  },
  {
    iso639_1: "",
    iso639_2: "luo",
    iso639_3: "luo",
    name: "Luo",
    nameLocal: "Dholuo",
    ietf: "luo",
    ietfRegions: {
      KE: "luo-KE", // Kenya
      UG: "luo-UG", // Uganda
    },
    lcid: 0,
    speakers: 4.2,
  },
  {
    iso639_1: "ln",
    iso639_2: "lin",
    iso639_3: "lin",
    name: "Lingala",
    nameLocal: "Lingála",
    ietf: "ln",
    ietfRegions: {
      CD: "ln-CD", // Democratic Republic of the Congo
      CG: "ln-CG", // Republic of the Congo
    },
    lcid: 1162,
    speakers: 20,
  },
  {
    iso639_1: "lo",
    iso639_2: "lao",
    iso639_3: "lao",
    name: "Lao",
    nameLocal: "ລາວ",
    ietf: "lo",
    ietfRegions: {
      LA: "lo-LA", // Laos
    },
    lcid: 1108,
    speakers: 30,
  },
  {
    iso639_1: "lv",
    iso639_2: "lav",
    iso639_3: "lav",
    name: "Latvian",
    nameLocal: "Latviešu",
    ietf: "lv",
    ietfRegions: {
      LV: "lv-LV", // Latvia
    },
    lcid: 1062,
    speakers: 1.8,
  },
  {
    iso639_1: "lt",
    iso639_2: "lit",
    iso639_3: "lit",
    name: "Lithuanian",
    nameLocal: "Lietuvių",
    ietf: "lt",
    ietfRegions: {
      LT: "lt-LT", // Lithuania
    },
    lcid: 1063,
    speakers: 3,
  },
  {
    iso639_1: "",
    iso639_2: "lub",
    iso639_3: "lub",
    name: "Luba-Katanga",
    nameLocal: "Kiluba",
    ietf: "lub",
    ietfRegions: {
      CD: "lub-CD", // Democratic Republic of Congo
    },
    lcid: 0,
    speakers: 6.3,
  },
  {
    iso639_1: "lb",
    iso639_2: "ltz",
    iso639_3: "ltz",
    name: "Luxembourgish",
    nameLocal: "Lëtzebuergesch",
    ietf: "lb",
    ietfRegions: {
      LU: "lb-LU", // Luxembourg
    },
    lcid: 1134,
    speakers: 0.4,
  },
  {
    iso639_1: "mk",
    iso639_2: "mkd",
    iso639_3: "mkd",
    name: "Macedonian",
    nameLocal: "Македонски",
    ietf: "mk",
    ietfRegions: {
      MK: "mk-MK", // North Macedonia
    },
    lcid: 1071,
    speakers: 2,
  },
  {
    iso639_1: "mg",
    iso639_2: "mlg",
    iso639_3: "mlg",
    name: "Malagasy",
    nameLocal: "Malagasy",
    ietf: "mg",
    ietfRegions: {
      MG: "mg-MG", // Madagascar
    },
    lcid: 1134,
    speakers: 25,
  },
  {
    iso639_1: "ms",
    iso639_2: "msa",
    iso639_3: "msa",
    name: "Malay",
    nameLocal: "Bahasa Melayu",
    ietf: "ms",
    ietfRegions: {
      MY: "ms-MY", // Malaysia
      SG: "ms-SG", // Singapore
    },
    lcid: 1086,
    speakers: 77,
  },
  {
    iso639_1: "mt",
    iso639_2: "mlt",
    iso639_3: "mlt",
    name: "Maltese",
    nameLocal: "Malti",
    ietf: "mt",
    ietfRegions: {
      MT: "mt-MT", // Malta
    },
    lcid: 1082,
    speakers: 0.52,
  },
  {
    iso639_1: "mi",
    iso639_2: "mri",
    iso639_3: "mri",
    name: "Maori",
    nameLocal: "Te Reo Māori",
    ietf: "mi",
    ietfRegions: {
      NZ: "mi-NZ", // New Zealand
    },
    lcid: 1153,
    speakers: 0.185,
  },
  {
    iso639_1: "ml",
    iso639_2: "mal",
    iso639_3: "mal",
    name: "Malayalam",
    nameLocal: "മലയാളം",
    ietf: "ml",
    ietfRegions: {
      IN: "ml-IN", // India
    },
    lcid: 1100,
    speakers: 42,
  },
  {
    iso639_1: "mai",
    iso639_2: "mai",
    iso639_3: "mai",
    name: "Maithili",
    nameLocal: "मैथिली",
    ietf: "mai",
    ietfRegions: {
      IN: "mai-IN", // India
      NP: "mai-NP", // Nepal
    },
    lcid: 2876, // Placeholder or specific if found (e.g., 0x0B3C for mai-NP)
    speakers: 34,
  },
  {
    iso639_1: "mdx",
    iso639_2: "mdx",
    iso639_3: "mdx",
    name: "Mandinka",
    nameLocal: "Mandinka",
    ietf: "mdx",
    ietfRegions: {
      GM: "mdx-GM", // Gambia
      SN: "mdx-SN", // Senegal
      GN: "mdx-GN", // Guinea
    },
    lcid: 1175,
    speakers: 1.3,
  },
  {
    iso639_1: "mni",
    iso639_2: "mni",
    iso639_3: "mni",
    name: "Manipuri",
    nameLocal: "মৈতৈলোন্",
    ietf: "mni",
    ietfRegions: {
      IN: "mni-IN", // India
    },
    lcid: 1112,
    speakers: 1.76,
  },
  {
    iso639_1: "mr",
    iso639_2: "mar",
    iso639_3: "mar",
    name: "Marathi",
    nameLocal: "मराठी",
    ietf: "mr",
    ietfRegions: {
      IN: "mr-IN", // India
    },
    lcid: 1102,
    speakers: 75,
  },
  {
    iso639_1: "mhr",
    iso639_2: "mhr",
    iso639_3: "mhr",
    name: "Meadow Mari",
    nameLocal: "Олык марий",
    ietf: "mhr",
    ietfRegions: {
      RU: "mhr-RU", // Russia
    },
    lcid: 1160,
    speakers: 0.47,
  },
  {
    iso639_1: "mrj",
    iso639_2: "mrj",
    iso639_3: "mrj",
    name: "Hill Mari",
    nameLocal: "Кырык мары",
    ietf: "mrj",
    ietfRegions: {
      RU: "mrj-RU", // Russia
    },
    lcid: 1161,
    speakers: 0.03,
  },
  {
    iso639_1: "",
    iso639_2: "min",
    iso639_3: "min",
    name: "Minangkabau",
    nameLocal: "Baso Minangkabau",
    ietf: "min",
    ietfRegions: {
      ID: "min-ID", // Indonesia
    },
    lcid: 0,
    speakers: 5.5,
  },
  {
    iso639_1: "lus",
    iso639_2: "lus",
    iso639_3: "lus",
    name: "Mizo",
    nameLocal: "Mizo ṭawng",
    ietf: "lus",
    ietfRegions: {
      IN: "lus-IN", // India
    },
    lcid: 1173,
    speakers: 0.83,
  },
  {
    iso639_1: "",
    iso639_2: "nan",
    iso639_3: "nan",
    name: "Min Nan Chinese (Hokkien)",
    nameLocal: "閩南語",
    ietf: "nan",
    ietfRegions: {
      CN: "nan-CN", // China
      TW: "nan-TW", // Taiwan
    },
    lcid: 0,
    speakers: 50,
  },
  {
    iso639_1: "ne",
    iso639_2: "nep",
    iso639_3: "nep",
    name: "Nepali",
    nameLocal: "नेपाली",
    ietf: "ne",
    ietfRegions: {
      NP: "ne-NP", // Nepal
    },
    lcid: 1121,
    speakers: 17,
  },
  {
    iso639_1: "",
    iso639_2: "new",
    iso639_3: "new",
    name: "Newari",
    nameLocal: "नेवारी",
    ietf: "new",
    ietfRegions: {
      NP: "new-NP", // Nepal
    },
    lcid: 0,
    speakers: 0.85,
  },
  {
    iso639_1: "nr",
    iso639_2: "nbl",
    iso639_3: "nbl",
    name: "Ndebele",
    nameLocal: "isiNdebele",
    ietf: "nr",
    ietfRegions: {
      ZA: "nr-ZA", // South Africa
    },
    lcid: 1174,
    speakers: 1.1,
  },
  {
    iso639_1: "no",
    iso639_2: "nor",
    iso639_3: "nor",
    name: "Norwegian",
    nameLocal: "Norsk",
    ietf: "no",
    ietfRegions: {
      NO: "no-NO", // Norway
    },
    lcid: 1044,
    speakers: 5,
  },
  {
    iso639_1: "ny",
    iso639_2: "nya",
    iso639_3: "nya",
    name: "Chichewa",
    nameLocal: "Chichewa",
    ietf: "ny",
    ietfRegions: {
      MW: "ny-MW", // Malawi
    },
    lcid: 1156,
    speakers: 12,
  },
  {
    iso639_1: "or",
    iso639_2: "ori",
    iso639_3: "ori",
    name: "Odia (Oriya)",
    nameLocal: "ଓଡ଼ିଆ",
    ietf: "or",
    ietfRegions: {
      IN: "or-IN", // India
    },
    lcid: 1096,
    speakers: 33,
  },
  {
    iso639_1: "om",
    iso639_2: "orm",
    iso639_3: "orm",
    name: "Oromo",
    nameLocal: "Afaan Oromoo",
    ietf: "om",
    ietfRegions: {
      ET: "om-ET", // Ethiopia
      KE: "om-KE", // Kenya
    },
    lcid: 1138,
    speakers: 37,
  },
  {
    iso639_1: "ps",
    iso639_2: "pus",
    iso639_3: "pus",
    name: "Pashto",
    nameLocal: "پښتو",
    ietf: "ps",
    ietfRegions: {
      AF: "ps-AF", // Afghanistan
    },
    lcid: 1123,
    speakers: 40,
  },
  {
    iso639_1: "fa",
    iso639_2: "fas",
    iso639_3: "fas",
    name: "Persian",
    nameLocal: "فارسی",
    ietf: "fa",
    ietfRegions: {
      IR: "fa-IR", // Iran
    },
    lcid: 1065,
    speakers: 50,
  },
  {
    iso639_1: "pl",
    iso639_2: "pol",
    iso639_3: "pol",
    name: "Polish",
    nameLocal: "Polski",
    ietf: "pl",
    ietfRegions: {
      PL: "pl-PL", // Poland
    },
    lcid: 1045,
    speakers: 50,
  },
  {
    iso639_1: "pt",
    iso639_2: "por",
    iso639_3: "por",
    name: "Portuguese",
    nameLocal: "Português",
    ietf: "pt",
    ietfRegions: {
      PT: "pt-PT", // Portugal
      BR: "pt-BR", // Brazil
    },
    lcid: 2070,
    speakers: 221,
  },
  {
    iso639_1: "pa",
    iso639_2: "pan",
    iso639_3: "pan",
    name: "Punjabi",
    nameLocal: "ਪੰਜਾਬੀ",
    ietf: "pa",
    ietfRegions: {
      IN: "pa-IN", // India
    },
    lcid: 1094,
    speakers: 125,
  },
  {
    iso639_1: "qu",
    iso639_2: "que",
    iso639_3: "que",
    name: "Quechua",
    nameLocal: "Runasimi",
    ietf: "qu",
    ietfRegions: {
      PE: "qu-PE", // Peru
      BO: "qu-BO", // Bolivia
      EC: "qu-EC", // Ecuador
    },
    lcid: 1131,
    speakers: 8.9,
  },
  {
    iso639_1: "rm",
    iso639_2: "roh",
    iso639_3: "roh",
    name: "Romansh",
    nameLocal: "Rumantsch",
    ietf: "rm",
    ietfRegions: {
      CH: "rm-CH", // Switzerland
    },
    lcid: 1166,
    speakers: 0.06,
  },
  {
    iso639_1: "rhg",
    iso639_2: "rhg",
    iso639_3: "rhg",
    name: "Rohingya",
    nameLocal: "Ruáingga",
    ietf: "rhg",
    ietfRegions: {
      MM: "rhg-MM", // Myanmar
      BD: "rhg-BD", // Bangladesh
    },
    lcid: 1177,
    speakers: 1.8,
  },
  {
    iso639_1: "ro",
    iso639_2: "ron",
    iso639_3: "ron",
    name: "Romanian",
    nameLocal: "Română",
    ietf: "ro",
    ietfRegions: {
      RO: "ro-RO", // Romania
    },
    lcid: 1048,
    speakers: 30,
  },
  {
    iso639_1: "ru",
    iso639_2: "rus",
    iso639_3: "rus",
    name: "Russian",
    nameLocal: "Русский",
    ietf: "ru",
    ietfRegions: {
      RU: "ru-RU", // Russia
    },
    lcid: 1049,
    speakers: 154,
  },
  {
    iso639_1: "rw",
    iso639_2: "kin",
    iso639_3: "kin",
    name: "Kinyarwanda",
    nameLocal: "Ikinyarwanda",
    ietf: "rw",
    ietfRegions: {
      RW: "rw-RW", // Rwanda
    },
    lcid: 1159,
    speakers: 12,
  },
  {
    iso639_1: "rn",
    iso639_2: "run",
    iso639_3: "run",
    name: "Kirundi",
    nameLocal: "Kirundi",
    ietf: "rn",
    ietfRegions: {
      BI: "rn-BI", // Burundi
    },
    lcid: 1185,
    speakers: 9,
  },
  {
    iso639_1: "sd",
    iso639_2: "snd",
    iso639_3: "snd",
    name: "Sindhi",
    nameLocal: "سنڌي",
    ietf: "sd",
    ietfRegions: {
      PK: "sd-PK", // Pakistan
      IN: "sd-IN", // India
    },
    lcid: 1113,
    speakers: 25,
  },
  {
    iso639_1: "sr",
    iso639_2: "srp",
    iso639_3: "srp",
    name: "Serbian",
    nameLocal: "Српски / Srpski",
    ietf: "sr",
    ietfRegions: {
      RS: "sr-RS", // Serbia
      BA: "sr-BA", // Bosnia and Herzegovina
    },
    lcid: 9242,
    speakers: 9,
  },
  {
    iso639_1: "",
    iso639_2: "sna",
    iso639_3: "sna",
    name: "Shona",
    nameLocal: "chiShona",
    ietf: "sna",
    ietfRegions: {
      ZW: "sna-ZW", // Zimbabwe
    },
    lcid: 0,
    speakers: 14.2,
  },
  {
    iso639_1: "si",
    iso639_2: "sin",
    iso639_3: "sin",
    name: "Sinhala",
    nameLocal: "සිංහල",
    ietf: "si",
    ietfRegions: {
      LK: "si-LK", // Sri Lanka
    },
    lcid: 1115,
    speakers: 17,
  },
  {
    iso639_1: "sk",
    iso639_2: "slk",
    iso639_3: "slk",
    name: "Slovak",
    nameLocal: "Slovenčina",
    ietf: "sk",
    ietfRegions: {
      SK: "sk-SK", // Slovakia
    },
    lcid: 1051,
    speakers: 5,
  },
  {
    iso639_1: "sl",
    iso639_2: "slv",
    iso639_3: "slv",
    name: "Slovenian",
    nameLocal: "Slovenščina",
    ietf: "sl",
    ietfRegions: {
      SI: "sl-SI", // Slovenia
    },
    lcid: 1060,
    speakers: 2,
  },
  {
    iso639_1: "so",
    iso639_2: "som",
    iso639_3: "som",
    name: "Somali",
    nameLocal: "Soomaali",
    ietf: "so",
    ietfRegions: {
      SO: "so-SO", // Somalia
    },
    lcid: 1143,
    speakers: 16,
  },
  {
    iso639_1: "st",
    iso639_2: "sot",
    iso639_3: "sot",
    name: "Sotho",
    nameLocal: "Sesotho",
    ietf: "st",
    ietfRegions: {
      ZA: "st-ZA", // South Africa
    },
    lcid: 1072,
    speakers: 5,
  },
  {
    iso639_1: "es",
    iso639_2: "spa",
    iso639_3: "spa",
    name: "Spanish",
    nameLocal: "Español",
    ietf: "es",
    ietfRegions: {
      ES: "es-ES", // Spain
      MX: "es-MX", // Mexico
      AR: "es-AR", // Argentina
      CO: "es-CO", // Colombia
      CL: "es-CL", // Chile
    },
    lcid: 3082, // Microsoft LCID for es-ES
    speakers: 460,
  },
  {
    iso639_1: "su",
    iso639_2: "sun",
    iso639_3: "sun",
    name: "Sundanese",
    nameLocal: "Basa Sunda",
    ietf: "su",
    ietfRegions: {
      ID: "su-ID", // Indonesia
    },
    lcid: 1121,
    speakers: 39,
  },
  {
    iso639_1: "sw",
    iso639_2: "swa",
    iso639_3: "swa",
    name: "Swahili",
    nameLocal: "Kiswahili",
    ietf: "sw",
    ietfRegions: {
      KE: "sw-KE", // Kenya
      TZ: "sw-TZ", // Tanzania
    },
    lcid: 1089,
    speakers: 16,
  },
  {
    iso639_1: "sv",
    iso639_2: "swe",
    iso639_3: "swe",
    name: "Swedish",
    nameLocal: "Svenska",
    ietf: "sv",
    ietfRegions: {
      SE: "sv-SE", // Sweden
      FI: "sv-FI", // Finland
    },
    lcid: 1053,
    speakers: 10,
  },
  {
    iso639_1: "tl",
    iso639_2: "tgl",
    iso639_3: "tgl",
    name: "Tagalog (Filipino)",
    nameLocal: "Tagalog / Pilipino",
    ietf: "tl",
    ietfRegions: {
      PH: "tl-PH", // Philippines
    },
    lcid: 1124, // LCID for Filipino
    speakers: 70, // Combined speakers for Tagalog/Filipino
  },
  {
    iso639_1: "tg",
    iso639_2: "tgk",
    iso639_3: "tgk",
    name: "Tajik",
    nameLocal: "Тоҷикӣ",
    ietf: "tg",
    ietfRegions: {
      TJ: "tg-TJ", // Tajikistan
    },
    lcid: 1064,
    speakers: 8,
  },
  {
    iso639_1: "",
    iso639_2: "tzm",
    iso639_3: "tzm",
    name: "Tamazight",
    nameLocal: "ⵜⴰⵎⴰⵣⵉⵖⵜ",
    ietf: "tzm",
    ietfRegions: {
      MA: "tzm-MA", // Morocco
      DZ: "tzm-DZ", // Algeria
    },
    lcid: 0,
    speakers: 4.6,
  },
  {
    iso639_1: "ta",
    iso639_2: "tam",
    iso639_3: "tam",
    name: "Tamil",
    nameLocal: "தமிழ்",
    ietf: "ta",
    ietfRegions: {
      IN: "ta-IN", // India
      LK: "ta-LK", // Sri Lanka
    },
    lcid: 1097,
    speakers: 70,
  },
  {
    iso639_1: "tt",
    iso639_2: "tat",
    iso639_3: "tat",
    name: "Tatar",
    nameLocal: "Татар",
    ietf: "tt",
    ietfRegions: {
      RU: "tt-RU", // Russia
    },
    lcid: 1092,
    speakers: 5,
  },
  {
    iso639_1: "te",
    iso639_2: "tel",
    iso639_3: "tel",
    name: "Telugu",
    nameLocal: "తెలుగు",
    ietf: "te",
    ietfRegions: {
      IN: "te-IN", // India
    },
    lcid: 1098,
    speakers: 75,
  },
  {
    iso639_1: "th",
    iso639_2: "tha",
    iso639_3: "tha",
    name: "Thai",
    nameLocal: "ไทย",
    ietf: "th",
    ietfRegions: {
      TH: "th-TH", // Thailand
    },
    lcid: 1054,
    speakers: 60,
  },
  {
    iso639_1: "bo",
    iso639_2: "bod",
    iso639_3: "bod",
    name: "Tibetan",
    nameLocal: "བོད་སྐད་",
    ietf: "bo",
    ietfRegions: {
      CN: "bo-CN", // China
      IN: "bo-IN", // India
    },
    lcid: 1170,
    speakers: 5.2,
  },
  {
    iso639_1: "ti",
    iso639_2: "tir",
    iso639_3: "tir",
    name: "Tigrinya",
    nameLocal: "ትግርኛ",
    ietf: "ti",
    ietfRegions: {
      ER: "ti-ER", // Eritrea
      ET: "ti-ET", // Ethiopia
    },
    lcid: 1139,
    speakers: 7,
  },
  {
    iso639_1: "to",
    iso639_2: "ton",
    iso639_3: "ton",
    name: "Tongan",
    nameLocal: "lea fakatonga",
    ietf: "to",
    ietfRegions: {
      TO: "to-TO", // Tonga
    },
    lcid: 1171,
    speakers: 0.1,
  },
  {
    iso639_1: "tr",
    iso639_2: "tur",
    iso639_3: "tur",
    name: "Turkish",
    nameLocal: "Türkçe",
    ietf: "tr",
    ietfRegions: {
      TR: "tr-TR", // Turkey
    },
    lcid: 1055,
    speakers: 70,
  },
  {
    iso639_1: "tn",
    iso639_2: "tsn",
    iso639_3: "tsn",
    name: "Tswana",
    nameLocal: "Setswana",
    ietf: "tn",
    ietfRegions: {
      BW: "tn-BW", // Botswana
      ZA: "tn-ZA", // South Africa
    },
    lcid: 1074,
    speakers: 5.8,
  },
  {
    iso639_1: "",
    iso639_2: "tso",
    iso639_3: "tso",
    name: "Tsonga",
    nameLocal: "Xitsonga",
    ietf: "tso",
    ietfRegions: {
      ZA: "tso-ZA", // South Africa
      MZ: "tso-MZ", // Mozambique
    },
    lcid: 0,
    speakers: 2.3,
  },
  {
    iso639_1: "tw",
    iso639_2: "twi",
    iso639_3: "twi",
    name: "Twi",
    nameLocal: "Twi",
    ietf: "tw",
    ietfRegions: {
      GH: "tw-GH", // Ghana
    },
    lcid: 1181,
    speakers: 9,
  },
  {
    iso639_1: "tk",
    iso639_2: "tuk",
    iso639_3: "tuk",
    name: "Turkmen",
    nameLocal: "Türkmençe",
    ietf: "tk",
    ietfRegions: {
      TM: "tk-TM", // Turkmenistan
    },
    lcid: 1090,
    speakers: 11,
  },
  {
    iso639_1: "uk",
    iso639_2: "ukr",
    iso639_3: "ukr",
    name: "Ukrainian",
    nameLocal: "Українська",
    ietf: "uk",
    ietfRegions: {
      UA: "uk-UA", // Ukraine
    },
    lcid: 1058,
    speakers: 45,
  },
  {
    iso639_1: "ur",
    iso639_2: "urd",
    iso639_3: "urd",
    name: "Urdu",
    nameLocal: "اردو",
    ietf: "ur",
    ietfRegions: {
      PK: "ur-PK", // Pakistan
      IN: "ur-IN", // India
    },
    lcid: 1056,
    speakers: 70,
  },
  {
    iso639_1: "uz",
    iso639_2: "uzb",
    iso639_3: "uzb",
    name: "Uzbek",
    nameLocal: "O'zbek",
    ietf: "uz",
    ietfRegions: {
      UZ: "uz-UZ", // Uzbekistan
    },
    lcid: 1091,
    speakers: 27,
  },
  {
    iso639_1: "ug",
    iso639_2: "uig",
    iso639_3: "uig",
    name: "Uyghur",
    nameLocal: "ئۇيغۇرچە",
    ietf: "ug",
    ietfRegions: {
      CN: "ug-CN", // China
    },
    lcid: 1184,
    speakers: 10,
  },
  {
    iso639_1: "",
    iso639_2: "ven",
    iso639_3: "ven",
    name: "Venda",
    nameLocal: "Tshivenḓa",
    ietf: "ven",
    ietfRegions: {
      ZA: "ven-ZA", // South Africa
    },
    lcid: 0,
    speakers: 1.2,
  },
  {
    iso639_1: "vi",
    iso639_2: "vie",
    iso639_3: "vie",
    name: "Vietnamese",
    nameLocal: "Tiếng Việt",
    ietf: "vi",
    ietfRegions: {
      VN: "vi-VN", // Vietnam
    },
    lcid: 1066,
    speakers: 75,
  },
  {
    iso639_1: "cy",
    iso639_2: "cym",
    iso639_3: "cym",
    name: "Welsh",
    nameLocal: "Cymraeg",
    ietf: "cy",
    ietfRegions: {
      GB: "cy-GB", // United Kingdom
    },
    lcid: 1106,
    speakers: 0.75,
  },
  {
    iso639_1: "",
    iso639_2: "wuu",
    iso639_3: "wuu",
    name: "Wu Chinese (Shanghainese)",
    nameLocal: "吴语",
    ietf: "wuu",
    ietfRegions: {
      CN: "wuu-CN", // China
    },
    lcid: 0,
    speakers: 80,
  },
  {
    iso639_1: "wo",
    iso639_2: "wol",
    iso639_3: "wol",
    name: "Wolof",
    nameLocal: "Wolof",
    ietf: "wo",
    ietfRegions: {
      SN: "wo-SN", // Senegal
    },
    lcid: 1165,
    speakers: 5,
  },
  {
    iso639_1: "xh",
    iso639_2: "xho",
    iso639_3: "xho",
    name: "Xhosa",
    nameLocal: "isiXhosa",
    ietf: "xh",
    ietfRegions: {
      ZA: "xh-ZA", // South Africa
    },
    lcid: 1076,
    speakers: 8,
  },
  {
    iso639_1: "yo",
    iso639_2: "yor",
    iso639_3: "yor",
    name: "Yoruba",
    nameLocal: "Yorùbá",
    ietf: "yo",
    ietfRegions: {
      NG: "yo-NG", // Nigeria
    },
    lcid: 1130,
    speakers: 38,
  },
  {
    iso639_1: "za",
    iso639_2: "zha",
    iso639_3: "zha",
    name: "Zhuang",
    nameLocal: "Vahcuengh",
    ietf: "za",
    ietfRegions: {
      CN: "za-CN", // China
    },
    lcid: 0,
    speakers: 16,
  },
  {
    iso639_1: "yi",
    iso639_2: "yid",
    iso639_3: "yid",
    name: "Yiddish",
    nameLocal: "ייִדיש",
    ietf: "yi",
    ietfRegions: {
      IL: "yi-IL", // Israel
      US: "yi-US", // United States
    },
    lcid: 1085,
    speakers: 1.5,
  },
  {
    iso639_1: "yue",
    iso639_2: "yue",
    iso639_3: "yue",
    name: "Cantonese",
    nameLocal: "粵語",
    ietf: "yue",
    ietfRegions: {
      HK: "yue-HK", // Hong Kong
      MO: "yue-MO", // Macau
    },
    lcid: 3076,
    speakers: 62,
  },
  {
    iso639_1: "zu",
    iso639_2: "zul",
    iso639_3: "zul",
    name: "Zulu",
    nameLocal: "isiZulu",
    ietf: "zu",
    ietfRegions: {
      ZA: "zu-ZA", // South Africa
    },
    lcid: 1077,
    speakers: 12,
  },
];

export default languages;
