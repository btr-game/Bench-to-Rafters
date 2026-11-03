// Round 36 (owner: "filter out curse words or non english characters in the player name"): the words
// a name may not hold, kept encoded so the published page does not carry them in plain text
// (ui/names.ts reads them). Three lists, so names that only look close still pass (Hancock, Swank,
// Draper): `anywhere` may sit inside a word or across spaced-out letters; `stem` starts a word;
// `word` is a whole word only.

const read = (b: string): string[] => atob(b).split(',');

export const BLOCKED = {
  anywhere: read('ZnVjayxjdW50LG5pZ2dlcixuaWdnYSxmYWdnb3QsbW90aGVyZixzaGl0LGJpdGNoLHdob3JlLHNsdXQsZGlsZG8saml6eixwdXNzeSxoaXRsZXIsd2V0YmFjayxyYWdoZWFk'),
  stem: read('YXNzaG9sLGRpY2toZWFkLGRvdWNoZSx3YW5rLHBlbmlzLHZhZ2luYSxwZWRvLG1vbGVzdCxyZXRhcmQsbWFzdHVyYixvcmdhc20sZWphY3VsLHRlc3RpYyxzY3JvdCxib2xsb2NrLGJhc3RhcmQsdHJhbm55LHBvcm4saG9ybmksYm9vYg=='),
  word: read('YXNzLGFyc2UsZGljayxjb2NrLHRpdCx0aXRzLHR3YXQscHJpY2sscGlzcyxjdW0sc2V4LHNleHksYW5hbCxyYXBlLHJhcGlzdCxuYXppLGhlaWwsa2trLGtpa2UsY2hpbmssc3BpYyxjb29uLGdvb2ssZHlrZSxmYWcsYmVhbmVyLG1pbGYsbnVkZSxudWRlcyx3dGYsc3RmdSxqZXJrb2ZmLHNpYmFsLHNzaWJhbCxzaGliYWwsZ2Flc2Fla2tpLGdhZXNhZWtpLGJ5dW5nc2hpbixieWVvbmdzaW4='),
};
