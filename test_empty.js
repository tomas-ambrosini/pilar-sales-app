const getPopulatedObj = (objA, objB) => (objA && Object.keys(objA).length > 0) ? objA : (objB || {});

const baseSys = { survey: {} };
const rawSys = { survey: { m1: "10", systemType: "Split AC" } };

console.log("SURVEY TEST:", getPopulatedObj(baseSys.survey, rawSys.survey));
