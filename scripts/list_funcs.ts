import { Project } from "ts-morph";
import * as fs from "fs";
import * as path from "path";

const project = new Project();
const sourceFile = project.addSourceFileAtPath("../src/components/Assets.tsx");

const funcs = sourceFile.getFunctions().map(f => f.getName());
console.log("Functions found:", funcs.filter(f => f));
