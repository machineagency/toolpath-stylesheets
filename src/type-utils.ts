export type EBB = "ebb";
export type GCode = "gcode";
export type SBP = "sbp";
export type ISA = EBB | GCode | SBP;
export type Instruction = string;

export interface Toolpath {
    isa: ISA;
    instructions: Instruction[];
}

export function toolpath(isa: ISA, instructions: Instruction[]): Toolpath {
    return {
        isa: isa,
        instructions: instructions
    }

}

export type Operation = "move" | "arc";
export interface IR {
    op: Operation;
    opCode: string;
    args: {
        x: number | null;
        y: number | null;
        z: number | null;
        f: number | null;
        dx: number | null;
        dy: number | null;
    }, 
    state: {
        units: string | null;
        toolOnBed: boolean;
        clockwise: number | null;
    }
};

export interface STEP {
    label: string;
    group: THREE.Group;
    text: {
        chars: string;
        x: string;
        y: string;
    }
}

