import { Toolpath, Instruction, Operation, IR } from './type-utils.ts';

export function ir(operation: Operation,
    x: number | null,
    y: number | null,
    z: number | null,
    f: number | null): IR {
    return {
        op: operation,
        args: {
            x: x,
            y: y,
            z: z,
            f: f
        }
    }
}

export function lowerGCode(gcodeTp: Toolpath) {
    let irs: IR[] = [];

    let opcodeRe = /(G[0-9]+|M[0-9]+)/;
    let opXRe = /X(-?[0-9]+.[0-9]+)/;
    let opYRe = /Y(-?[0-9]+.[0-9]+)/;
    let opZRe = /Z(-?[0-9]+.[0-9]+)/;
    let opFRe = /F(-?[0-9]+.[0-9]+)/;
    let findOpcode = (instruction: Instruction, argRe: RegExp) => {
      let maybeArgResults = instruction.match(argRe);
      if (!maybeArgResults) {
        return "";
      }
      return maybeArgResults[0];
    };
    let findArg = (instruction: Instruction, argRe: RegExp) => {
      let maybeArgResults = instruction.match(argRe);
      if (!maybeArgResults || maybeArgResults.length < 2) {
        return null;
      }
      return parseFloat(maybeArgResults[1]) || null;
    };

    gcodeTp.instructions.forEach(function (instruction: Instruction) {
      if (!instruction || instruction[0] == "''") {
        return;
      }

      let newPosition;
      let opcode = findOpcode(instruction, opcodeRe);
      if (opcode === "G0" || opcode === "G1") {
        let opx = findArg(instruction, opXRe);
        let opy = findArg(instruction, opYRe);
        let opz = findArg(instruction, opZRe);
        let opf = findArg(instruction, opFRe);

        newPosition = ir("move", opx, opy, opz, opf);
        irs.push(newPosition);
      }
    });
    return irs;
}

export function lowerSBP(sbpTp: Toolpath) {
    let irs: IR[] = [];

    sbpTp.instructions.forEach(function (instruction: Instruction) {
        if (!instruction || instruction[0] == "''") {
            return;
        }
        
        let newPosition;
        let tokens = instruction.trim().split(",");
        let opcode = tokens[0];
        if (opcode === "M2" || opcode === "J2") {
            newPosition = ir("move", parseFloat(tokens[1]), 
                             parseFloat(tokens[2]), 0, null);
        } else if (opcode === "M3" || opcode === "J3") {
            newPosition = ir("move", parseFloat(tokens[1]), parseFloat(tokens[2]),
                             parseFloat(tokens[3]), null);
        } else if (opcode === "MZ" || opcode === "JZ") {
            newPosition = ir("move", 0, 0, parseFloat(tokens[1]), null);
        } else if (opcode === "MX" || opcode === "JX") {
            newPosition = ir("move", parseFloat(tokens[1]), 0, 0, null);
        } else if (opcode === "MY" || opcode === "JY") {
            newPosition = ir("move", 0, parseFloat(tokens[1]), 0, null);
        } else {
            return;
        }
        irs.push(newPosition);
    });
    return irs;
}

/*lowerEBB(ebbTp: Toolpath) {
    let irs: IR[] = [];

}*/