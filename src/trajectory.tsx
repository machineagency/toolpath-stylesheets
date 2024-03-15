import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {useEffect, useRef} from "react";
import { norm, number, dot, isNaN } from "mathjs";
import { IR, Instruction } from './type-utils';
import { lowerEBB, lowerGCode, lowerSBP } from './ir';
import { toolpath, Toolpath } from './type-utils';
import { exampleToolpaths } from './example-toolpaths';

import * as Plot from "@observablehq/plot";

import { fftInPlace, util, ComplexNumber } from "fft-js";

import './trajectory.css'

const DEBUG: boolean = false;

type AllSegments = "all_segments";
type SegmentIdSet = Set<number> | AllSegments;

interface TrajectoryWindowProps {
    toolpath: Toolpath | null;
    lineSegments: LineSegment[];
    filterSegmentIds: SegmentIdSet;
}

interface DashboardSettingsProps {
    onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    onLimitChange: (newLimits: KinematicLimits) => void;
}

interface PlotProps {
    lineSegments: LineSegment[];
    filterSegmentIds: Set<number> | AllSegments;
}

const TOOLPATH_TABLE: Record<string, Toolpath> = {
    testToolpath: toolpath("sbp", ["M2, 0, 0", "M2, 10, 10"]),
    rectangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 10, 5", "M2, 0, 5", "M2, 0, 0"]),
    triangle: toolpath("sbp", ["M2, 0, 0", "M2, 10, 0", "M2, 5, 5", "M2, 0, 0"]),
    star: toolpath("sbp", ["M2, 50, 0", "M2, 65, 35", "M2, 100, 35", "M2, 75, 60",
                    "M2, 90, 95", "M2, 50, 75", "M2, 10, 95", "M2, 25, 60", "M2, 0, 35",
                    "M2, 35, 35", "M2, 50, 0"]),
    wave: exampleToolpaths.gCodeWave,
    box: exampleToolpaths.ebbBox,
    signature: exampleToolpaths.ebbSignature,
    gears: exampleToolpaths.gears,
    propellerTopScallop: exampleToolpaths.propellerTopScallop,
    propellerTopPocket: exampleToolpaths.propellerTopPocket
};

interface TextInputProps {
    label: string;
    value: string;
    onValueChange: (newValue: string) => void;
}

const TextInput = ({ label, value, onValueChange }: TextInputProps) => {
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.trim();
        if (/^\d*\.?\d*$/.test(value)) {
            onValueChange(value);
        } 
    };
  
    return (
        <div className="text-input">
          <label>{label}</label>
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder={`Enter ${label}`}
        />
      </div>
    );
};

interface LimitInputs {
    vMaxX: string;
    vMaxY: string;
    vMaxZ: string;
    aMaxX: string;
    aMaxY: string;
    aMaxZ: string;
    junctionDeviation: string;
    junctionSpeed: string;
}

function DashboardSettings({ onSelect, onLimitChange }: DashboardSettingsProps) {
    const toolpathsOptionElements = Object.keys(TOOLPATH_TABLE).map(tpName => {
        return <option value={tpName} key={tpName}>{tpName}</option>
    });
    const defaultKLInputs: LimitInputs = {
        vMaxX: '300.0',
        vMaxY: '300.0',
        vMaxZ: '150.0',
        aMaxX: '50.0',
        aMaxY: '50.0',
        aMaxZ: '25.0',
        junctionDeviation: '0.001',
        junctionSpeed: '0.01'
    };
    const parseLimitInputs = (inputs: LimitInputs): KinematicLimits | null => {
        let validate = (kl: KinematicLimits) => {
            return !(isNaN(kl.vMax.x) || isNaN(kl.vMax.y) || isNaN(kl.vMax.z)
                || isNaN(kl.aMax.x) || isNaN(kl.aMax.y) || isNaN(kl.aMax.z)
                || isNaN(kl.junctionDeviation) || isNaN(kl.junctionSpeed));
        };
        let kl = {
            vMax: {
                x: parseFloat(inputs.vMaxX),
                y: parseFloat(inputs.vMaxY),
                z: parseFloat(inputs.vMaxZ),
            },
            aMax: {
                x: parseFloat(inputs.aMaxX),
                y: parseFloat(inputs.aMaxY),
                z: parseFloat(inputs.aMaxZ),
            },
            junctionDeviation: parseFloat(inputs.junctionDeviation),
            junctionSpeed: parseFloat(inputs.junctionSpeed)
        };
        if (validate(kl)) {
            return kl;
        }
        return null;
    };
    const [limitInputs, setLimitInputs] = useState<LimitInputs>(defaultKLInputs);

    const handleValueChange = (key: keyof LimitInputs, newValue: string) => {
        setLimitInputs({
          ...limitInputs,
          [key]: newValue,
        });
    };

    useEffect(() => {
        let kl = parseLimitInputs(limitInputs);
        if (kl !== null) {
            onLimitChange(kl);
        }
    }, [limitInputs])

    let inputElements = Object.keys(limitInputs).map(key => {
        return (
           <TextInput
                label={key}
                key={key}
                value={limitInputs[key as keyof LimitInputs]}
                onValueChange={(newValue) => handleValueChange(
                                    key as keyof LimitInputs, newValue)}
            />
        ); 
    });

    // TODO: pass the parsed (and ideally validated) kl to parent and redraw graphs

    return (
        <div className="dashboard-settings">
            <select onChange={onSelect} name="toolpath-select" id="toolpath-select">
                {toolpathsOptionElements}
            </select>
            <div className="klimit-inputs">
                {inputElements}
            </div>
        </div>
    );
}

interface Vec3WithId {
    x: number;
    y: number;
    z: number;
    id: number;
}

function SegmentPlot({ lineSegments, filterSegmentIds }: PlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const findXYExtrema = (lineSegments: LineSegment[]): [number, number] => {
        let points = lineSegments.flatMap(ls => [ls.start, ls.end]);
        let components = points.flatMap(pt => [pt.x, pt.y]);
        return [Math.min(...components), Math.max(...components)];
    }

    useEffect(() => {
        if (lineSegments === undefined) return;
        let extrema = findXYExtrema(lineSegments);
        let windowSize = 7;
        let windowCenterIdx = Math.floor(windowSize / 2);
        let cost = (distance: number, timeDiff: number) => {
            if (distance === 0 || timeDiff === 0) {
                // It seems we hit this case every time, so just ignore it
                // By returning 0 until we understand what's going on.
                return 0;
            }
            return Math.max(0,
                Math.log((1 / distance) / timeDiff)
            );
        };
        // Assumption: look backwards and forwards each k/2 segment's start only
        // TODO: remove explicit slicing for performance
        let weightedPoints = lineSegments.flatMap((segment, idx, arr) => {
            let windowLower = Math.max(0, idx - windowSize);
            let windowUpper = Math.min(arr.length - 1, idx + windowSize);
            let window = arr.slice(windowLower, windowUpper);
            let l1Norm = (ls1: LineSegment, ls2: LineSegment) => {
                let dx = Math.abs(ls1.start.x - ls2.start.x);
                let dy = Math.abs(ls1.start.y - ls2.start.y);
                return dx + dy;
            }
            let windowCenter = window[windowCenterIdx];
            let weightedDistanceResiduals = window.map((ls, idx, arr) => {
                if (idx === windowCenterIdx) {
                    return 0;
                }
                let distance = l1Norm(ls, windowCenter);
                let subWindow = idx <= windowCenterIdx
                                    ? arr.slice(idx, windowCenterIdx)
                                    : arr.slice(windowCenterIdx + 1, idx);
                let timeDiff = subWindow.reduce((timeSoFar, currLs) => {
                    return timeSoFar + currLs.profile.t;
                }, 0);
                return cost(distance, timeDiff);
            });
            return {
                id: segment.parent,
                x: segment.start.x,
                y: segment.start.y,
                z: weightedDistanceResiduals.reduce((soFar, curr) => soFar + curr, 0)
            };
        });
        const xyPlot = Plot.plot({
          grid: true,
          x: {
            domain: extrema
          },
          y: {
            domain: extrema
          },
          // TODO: try cooler marks :)
          marks: [
            Plot.dot(weightedPoints, {
                filter: (pt: Vec3WithId) => {
                    return (filterSegmentIds === 'all_segments')
                        ? true : filterSegmentIds.has(pt.id);
                },
                x: 'x',
                y: 'y',
                r: 'z',
                strokeWidth: 0,
                fill: 'gray'
            })
            // Plot.line(lineSegments.flatMap((segment) => {
            //     let startPlusId = {...segment.start, id: segment.parent};
            //     let endPlusId = {...segment.end, id: segment.parent};
            //     return [startPlusId, endPlusId, null]
            // }), {
            //     filter: (point: Vec3WithId | null) => {
            //         if (point === null || filterSegmentIds === 'all_segments') {
            //             return true;
            //         } else {
            //             return filterSegmentIds.has(point.id);
            //         }
            //     },
            //     x: (d: Vec3 | null) => {
            //         if (d === null) {
            //             return null;
            //         }
            //         return d.x;
            //     },
            //     y: (d: Vec3 | null) => {
            //         if (d === null) {
            //             return null;
            //         }
            //         return d.y;
            //     }
            // })
          ]
        });
        if (containerRef.current) {
            containerRef.current.append(xyPlot);
        }
        return () => {
            xyPlot.remove();
        };
      }, [lineSegments, filterSegmentIds]);

    return <div className="flex" ref={containerRef}/>;
}

function filterLineSegments(lineSegments: LineSegment[],
                            filterIds: SegmentIdSet) {
    if (filterIds === 'all_segments') {
        return lineSegments;
    }
    return lineSegments.filter(ls => ls === null || filterIds.has(ls.parent));
}

function ProfilePlot({ lineSegments, filterSegmentIds }: PlotProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (lineSegments === undefined) return;
        let cumulativeTimes: (number | null)[] = [];
        let soFar = 0;
        filterLineSegments(lineSegments, filterSegmentIds)
            .forEach((ls: LineSegment) => {
                let newTime = soFar + ls.profile.t;
                cumulativeTimes.push(soFar);
                cumulativeTimes.push(newTime);
                cumulativeTimes.push(null);
                soFar = newTime;
            });

        const vPairs = filterLineSegments(lineSegments, filterSegmentIds)
            .flatMap((ls: LineSegment) => {
                let v0Pair = [ls.profile.v0, ls.parent];
                let vPair = [ls.profile.v, ls.parent];
                return [v0Pair, vPair, null];
            }).filter(el => el !== undefined);
        const aPairs = filterLineSegments(lineSegments, filterSegmentIds)
            .flatMap((ls: LineSegment) => {
                let aPair = [ls.profile.a, ls.parent];
                return [aPair, aPair, null];
            }).filter(el => el !== undefined);

        const plot = Plot.plot({
            x: {
                grid: true,
                label: "time (s)",
            },
            y: {
              grid: true,
              label: "mm / s ( / s)"
            },
            marks: [
              Plot.line(cumulativeTimes, {
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i]?.[0],
                stroke: "#4e79a7"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => vPairs[i],
                text: (_) => "Velocity",
                lineAnchor: "top",
                dy: -5
              })),
              Plot.line(cumulativeTimes, {
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i]?.[0],
                stroke: "#e15759"
              }),
              Plot.text(cumulativeTimes, Plot.selectLast({
                x: (_, i: number) => cumulativeTimes[i],
                y: (_, i: number) => aPairs[i],
                text: (_) => "Acceleration",
                lineAnchor: "top",
                dy: -5
              }))
            ]
          })
        if (containerRef.current) {
            containerRef.current.append(plot);
        }

        return () => plot.remove();
      }, [lineSegments, filterSegmentIds]);

    return <div ref={containerRef}/>;
}

interface DepthHistogramProps {
    lineSegments: LineSegment[];
    onBinSelect: (setIds: Set<number> | AllSegments) => void;
}

interface LineSegmentWithId extends LineSegment {
    id: number;
}

function DepthHistogram({ lineSegments, onBinSelect }: DepthHistogramProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const zPlot = Plot.plot({
          grid: true,
          marks: [
            Plot.line(lineSegments.flatMap((segment) => {
                let startPlusId = {...segment.start, id: segment.parent};
                let endPlusId = {...segment.end, id: segment.parent};
                return [startPlusId, endPlusId, null]
            }), Plot.brushX({
                x: (_, index: number) => {
                    return index / 3;
                },
                y: (d: Vec3 | null) => {
                    if (d === null) {
                      return null;
                    }
                    return d.z;
                },
                strokeWidth: 0.5
            }))
          ]
        });
        zPlot.addEventListener("input", (_) => {
          if (zPlot.value === null) {
              onBinSelect('all_segments');
              return;
          }
          let selectedSegments = zPlot.value.flat() as (LineSegmentWithId | null)[];
          let segIds = selectedSegments
              .filter(maybeSeg => maybeSeg !== null)
              .map(ls => {
                  if (ls === null) {
                      return null
                  } else {
                      return ls.id;
                  }
              }) as number[];
          let idSet = new Set(segIds);
          onBinSelect(idSet);
        });
        if (containerRef.current) {
            containerRef.current.append(zPlot);
        }
        return () => {
            zPlot.remove();
        };
    }, [lineSegments]);
    return (
        <div className="depth-histogram-container">
            <div className="plot-title">Depth by Segment</div>
            <div className="depth-histogram" ref={containerRef}></div>
        </div>
    );
}

interface Vec3 {
    x: number,
    y: number,
    z: number
}

interface Segment {
    instruction: Instruction,
    moveId: number,
    startVelocity: number,
    endVelocity: number,
    coords: Vec3 
}

interface LineSegment {
    instruction: Instruction;
    parent: number,
    start: Vec3,
    end: Vec3,
    unit: Vec3,
    profile: FirstOrder,
    aMax: number
}

interface KinematicLimits {
    vMax: Vec3,
    aMax: Vec3,
    junctionSpeed: number,
    junctionDeviation: number
}

interface FirstOrder {
    v0: number,
    v: number,
    a: number,
    t: number,
    x: number
}

interface TrajectoryPasses {
    locations: Segment[],
    prePlanned: LineSegment[],
    halfPlanned: LineSegment[],
    fullyPlanned: LineSegment[]
}

function Vec3(x: number, y: number, z: number): Vec3 {
    return {
        x: x,
        y: y,
        z: z
    }
}
function segment(instruction: Instruction, moveId: number, startVelocity: number,
                    endVelocity: number, coords: Vec3): Segment {
    return {
        instruction: instruction,
        moveId: moveId,
        startVelocity: startVelocity,
        endVelocity: endVelocity,
        coords: coords
    }
}

function lineSegment(instruction: Instruction, parent: number, start: Vec3, end: Vec3,
                     unit: Vec3, profile: FirstOrder, amax: number): LineSegment {
    return {
        instruction: instruction,
        parent: parent,
        start: start,
        end: end,
        unit: unit,
        profile: profile,
        aMax: amax
    }
}

function firstOrder(initialVelocity: number, finalVelocity: number, acceleration: number,
         timeDuration: number, length: number): FirstOrder {
    return {
        v0: initialVelocity,
        v: finalVelocity,
        a: acceleration,
        t: timeDuration,
        x: length
    }
}

function planTriplets(locations: Segment[], prePlanned: LineSegment[],
    halfPlanned: LineSegment[], fullyPlanned: LineSegment[]): TrajectoryPasses {
    return {
        locations: locations,
        prePlanned: prePlanned,
        halfPlanned: halfPlanned,
        fullyPlanned: fullyPlanned
    }
}

function fromGeo(instruction: Instruction, parent: number, v0: number, v1: number,
                    start: Vec3, end: Vec3, k1: KinematicLimits): LineSegment {
    let startVel = Math.abs(v0);
    let endVel = Math.abs(v1);
    let delta = Vec3(end.x - start.x, end.y - start.y, end.z - start.z)

    let length = Math.sqrt((end.x - start.x)**2 + (end.y - start.y)**2);
    let profile = normalize(startVel, endVel, null, null, length) as FirstOrder;
    let unit = Vec3(delta.x / length, delta.y / length, delta.z / length);
    return lineSegment(instruction, parent, start, end, unit, profile,
                        limitVector(unit, k1.aMax));

}

function limitVector(unitVec: Vec3, limits: Vec3): number {
    let absUnitVec = Vec3(Math.abs(unitVec.x) / limits.x,
                          Math.abs(unitVec.y) / limits.y,
                          Math.abs(unitVec.z) / limits.z);
    // TODO: determine if we need to treat Z differently, we don't want 2D moves
    // to behave differently.
    let max = Math.max(absUnitVec.x, absUnitVec.y, absUnitVec.z);
    return 1 / max;
}

function normalize(v0: number | null, v: number | null, a: number | null,
                    t: number | null, x: number | null): FirstOrder | null {
    let arr = [v0, v, a, t, x];
    if ((arr.length - arr.filter(element => element !== null
            && !isNaN(element)).length) != 2) {
        return null;
    }

    if (v0 === null) {
        if (v === null) {
            let startVel = x! / t! - a! * t! / 2;
            return firstOrder(startVel, startVel + a! * t!, a!, t!, x!);
        } else if (a === null) {
            let startVel = 2 * x! / t! - v;
            return firstOrder(startVel, v, (v - startVel) / t!, t!, x!);
        } else if (t === null) {
            let startVel = Math.sqrt(v**2 - 2 * a * x!);
            return firstOrder(startVel, v, a, (v - startVel) / a, x!);
        } else if (x === null) {
            let startVel = v - a * t;
            return firstOrder(startVel, v, a, t, t * (startVel + v) / 2);
        }
    }
    if (v === null) {
        if (a === null) {
            let endVel = 2 * x! / t! - v0!;
            return firstOrder(v0!, endVel, (endVel - v0!) / t!, t!, x!);
        } else if (t === null) {
            let endVel = Math.sqrt(v0!**2 + 2 * a * x!);
            return firstOrder(v0!, endVel, a, (endVel - v0!) / a, x!);
        } else {
            let endVel = v0! + a * t;
            return firstOrder(v0!, endVel, a, t, t * (v0! + endVel) / 2);
        }
    }
    if (a === null) {
        if (t === null) {
            let time = 2 * x! / (v0! + v);
            return firstOrder(v0!, v, (v - v0!) / time, time, x!);
        } else if (x === null) {
            let acc = (v - v0!) / t;
            return firstOrder(v0!, v, acc, t, t * (v0! + v) / 2);
        }
    }
    let time = (v - v0!) / a!;
    return firstOrder(v0!, v, a!, time, time * (v0! + v) / 2);
}

function computeLineSegments(tp: Toolpath, kl: KinematicLimits): TrajectoryPasses {
    let irs;
    // handles lowering
    if (tp.isa == "ebb") {
        irs = lowerEBB(tp);
    } else if (tp.isa == "sbp") {
        irs = lowerSBP(tp);
    } else {
        irs = lowerGCode(tp);
    }
    let segments: Segment[] = [];
    let isNullMoveCommand = (ir: IR) => {
        return ir.op === "move" && (ir.args.x === null || ir.args.y === null);
    }
    let vMaxEitherAxis = Math.max(kl.vMax.x, kl.vMax.y);
    irs.forEach(function (ir: IR, index: number) {
        if (isNullMoveCommand(ir)) {
            return;
        }
        let seg = segment(ir.originalInstruction, index, vMaxEitherAxis, vMaxEitherAxis,
                            Vec3(ir.args.x!, ir.args.y!, ir.args.z!));
        segments.push(seg);
    });
    let startLocation = { x: 0, y: 0, z: 0};
    let plannerSegments: LineSegment[] = [];

    segments.forEach(function (s: Segment) {
        let endLocation = s.coords;
        let segmentNorm = number(norm([startLocation.x - endLocation.x,
                                       startLocation.y - endLocation.y]));

        if (segmentNorm >= 1e-18) {
            let segment = fromGeo(s.instruction, s.moveId, s.startVelocity,
                                  s.endVelocity, startLocation, endLocation, kl);
            plannerSegments.push(segment);
            startLocation = endLocation;
        }
    });

    let halfPlanned = [... forwardPass(plannerSegments, 0, kl)];

    let plannedSegments = [...planSegments(plannerSegments, kl)];

    return planTriplets(segments, plannerSegments, halfPlanned, plannedSegments);
}

function* planSegments(segs: LineSegment[], k1: KinematicLimits, v0: number = 0.0) {
    for (let chunk of backwardPass([...forwardPass(segs, v0, k1)])) {
        yield* chunk;
    }
}

function backwardPass(segments: LineSegment[], v: number = 0) {
    let out = [];
    let runningV = v;
    for (let i = segments.length - 1; i >= 0; i--) {
        out[i] = [...planSegment(segments[i], runningV, true)];
        runningV = out[i][0].profile.v0;
    }
    return out;
}

function* forwardPass(segments: LineSegment[], v0: number, limits: KinematicLimits) {
    let res: LineSegment[] = [];
    if (segments.length == 0) {
        return res;
    }
    let prev: LineSegment | null = null;
    let velocityInit = v0;
    for (let s of segments) {
        let p = s.profile;
        let v = limitVector(s.unit, limits.vMax);

        if (prev != null) {
            let jv = computeJunctionVelocity(prev, s, limits);
            if (jv != null) {
                velocityInit = Math.min(velocityInit, jv);
            }
        }

        let changed = false;
        if (p.v0 > v || p.v > v) {
            p = normalize(Math.min(p.v0, v), Math.min(p.v, v), null, null, p.x) as FirstOrder;
            changed = true;
        }
        if (Math.abs(p.a) > s.aMax) {
            p = normalize(p.v0, null, s.aMax * p.a / Math.abs(p.a), null, p.x) as FirstOrder;
            changed = true;
        }
        let seg = s;
        if (changed) {
            seg = lineSegment(s.instruction, s.parent, s.start, s.end, s.unit, p, s.aMax);
        }

        for (let sub of planSegment(seg, velocityInit)) {
            velocityInit = sub.profile.v;
            yield sub;
        }

        prev = seg;
    }
}

function* planSegment(s: LineSegment, v: number, reverse: boolean = false) {
    let a = s.aMax;
    let p;
    if (reverse) {
        p = reverseFirstOrder(s.profile);
    } else {
        p = s.profile;
    }

    if (p.v0 <= v) {
        yield s;
        return;
    }

    let da = a - p.a;
    let dv = p.v0 - v;

    if (da <= 0 || p.t * da <= dv) {
        if (reverse) {
            p = normalize(null, v, -1 * a, null, p.x);
        } else {
            p = normalize(v, null, a, null, s.profile.x);
        }
        yield lineSegment(s.instruction, s.parent, s.start, s.end, s.unit, p!, s.aMax);
        return;
    }

    let firstProfile = normalize(v, null, a, dv / da, null) as FirstOrder;
    let secondProfile = normalize(firstProfile.v, p.v, null, null,  p.x - firstProfile.x) as FirstOrder;

    if (reverse) {
        // potential area for error
        let firstProfileOg = firstProfile;
        firstProfile = reverseFirstOrder(secondProfile);
        secondProfile = reverseFirstOrder(firstProfileOg);
    }

    let crossing = Vec3(s.start.x + s.unit.x * firstProfile.x,
                          s.start.y + s.unit.y * firstProfile.x,
                          s.start.z + s.unit.z * firstProfile.x);

    yield lineSegment(s.instruction, s.parent, s.start, crossing, s.unit, firstProfile, s.aMax);
    yield lineSegment(s.instruction, s.parent, crossing, s.end, s.unit, secondProfile, s.aMax);
}

function reverseFirstOrder(profile: FirstOrder): FirstOrder {
    return firstOrder(profile.v, profile.v0, 0 - profile.a, profile.t, profile.x);
}

function computeJunctionVelocity(p: LineSegment, s: LineSegment, limits: KinematicLimits): number | null {
    let junctionCos = -1 * dot([s.unit.x, s.unit.y], [p.unit.x, p.unit.y]);

    if (junctionCos > 0.9999) {
        return limits.junctionSpeed;
    } else if (junctionCos < -0.9999) {
        return null;
    } else {
        let junctionVect = Vec3(s.unit.x - p.unit.x, s.unit.y - p.unit.y, s.unit.z - p.unit.z);
        let vectDotSelf = dot([junctionVect.x, junctionVect.y, junctionVect.z],
                              [junctionVect.x, junctionVect.y, junctionVect.z]);
        junctionVect.x /= Math.sqrt(vectDotSelf);
        junctionVect.y /= Math.sqrt(vectDotSelf);
        junctionVect.z /= Math.sqrt(vectDotSelf);

        let junctionAcceleration = limitValueByAxis(limits.aMax, junctionVect);
        let sinThetaD2 = Math.sqrt(0.5 * (1 - junctionCos));
        let junctionVelocity = (junctionAcceleration * limits.junctionDeviation
                                * sinThetaD2) / (1 - sinThetaD2);
        return Math.max(limits.junctionSpeed, junctionVelocity);
    }
}

function limitValueByAxis(limits: Vec3, vector: Vec3): number {
    let limitValue = 1e19;
    if (vector.x != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.x / vector.x));
    }
    if (vector.y != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.y / vector.y));
    }
    if (vector.z != 0) {
        limitValue = Math.min(limitValue, Math.abs(limits.z / vector.z));
    }
    return limitValue;
}

/*
function linspace(start: number, stop: number, cardinality: number): number[] {
    let arr: number[] = [];
    let step = (stop - start) / (cardinality - 1);
    for (let i = 0; i < cardinality; i++) {
        arr.push(start + (step * i));
    }

    return arr;
}
*/

function TrajectoryWindow({ toolpath, lineSegments, filterSegmentIds }: TrajectoryWindowProps) {
    // TODO: do all the planning using the toolpath parameter passed in the props
    // let { locations, prePlanned, halfPlanned, fullyPlanned} = makeTestSegment(20);
    if (!toolpath) {
        // If no toolpath is selected, render empty divs for the graphs
        return (
            <div>
                <div className="plot-title">XY Spatial Toolpath</div>
                <div className="empty-plot">No toolpath selected</div>

                {DEBUG && (
                    <React.Fragment>
                    <div className="plot-title">Pre-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    <div className="plot-title">Half-planned Segments</div>
                    <div className="empty-plot">No toolpath selected</div>
                    </React.Fragment>
                )}
                <div className="plot-title">XY Spatial Toolpath</div>
                <div className="empty-plot">No toolpath selected</div>
            </div>
        );
    }

    return (<div>
        {/* {DEBUG && (
            <React.Fragment>
            <div className="plot-title">Pre-planned Segments</div>
            <ProfilePlot lineSegments={prePlanned} min={min} max={max}></ProfilePlot>
            <div className="plot-title">Half-planned Segments</div>
            <ProfilePlot lineSegments={halfPlanned} min={min} max={max}></ProfilePlot>
            </React.Fragment>
        )} */}
        <div className="plot-title">Velocity Curve</div>
        <ProfilePlot lineSegments={lineSegments} filterSegmentIds={filterSegmentIds}/>
        <div className="plot-title">XY Spatial Toolpath</div>
        <SegmentPlot lineSegments={lineSegments} filterSegmentIds={filterSegmentIds}/>
    </div>)
};

interface FourierAnalysis {
    frequencies: number[];
    magnitudes: number[];
}

interface FourierAnalysisWindowProps {
    lineSegments: LineSegment[];
    filterSegmentIds: SegmentIdSet;
}

// @ts-ignore: keep convolution here now in case we need it later.
function convolve(signal: number[], filter: number[]) {
    let outputLen = signal.length * 2;
    let newSig = new Array<number>(outputLen);
    let sum = 0;
    //let signalMax = Math.max(Math.max(...signal), 1);
    let filterMax = Math.max(Math.max(...filter), 1);
    // let normSignal = signal.map((e) => e / signalMax);
    let normFilter = filter.map((e) => e / filterMax);
    for (let i = 0; i < outputLen; i++) {
        for (let j = Math.max(0, i - signal.length); j <= i; j++) {
            let jInBounds = j < signal.length && i - j < filter.length;
            if (jInBounds) {
                sum += signal[j] * normFilter[i - j];
            }
        }
        newSig[i] = sum;
        sum = 0;
    }
    let begin = Math.floor(outputLen * 0.25);
    let end = Math.floor(outputLen * 0.75);
    return newSig.slice(begin, end);
}

// @ts-ignore
function makeSquareKernel() {
    let low = new Array(75).fill(0);
    let high = new Array(50).fill(50);
    return low.concat(high).concat(low);
}

function calculateAnalysis(signal: number[], sampleRate: number): FourierAnalysis {
    if (signal.length === 0) {
        return { frequencies: [], magnitudes: [] };
    }
    let maxLength = 1024;
    let greatestPowerOfTwo = 2 ** Math.floor(Math.log2(signal.length));
    let clipLength = Math.min(maxLength, greatestPowerOfTwo);
    let subsignal = signal.slice(0, clipLength);
    let phasor = subsignal.slice(0, subsignal.length) as unknown;
    fftInPlace(phasor as number[]);
    let freqBins = util.fftFreq(phasor as ComplexNumber[], sampleRate);
    let magnitudes = util.fftMag(phasor as ComplexNumber[]);
    return { frequencies: freqBins, magnitudes: magnitudes };
}

function FourierAnalysisWindow({ lineSegments, filterSegmentIds }:
                                    FourierAnalysisWindowProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        //TODO: low-pass filter the signal first--too many high frequencies
        let culledSegments = filterLineSegments(lineSegments, filterSegmentIds);
        let signal = culledSegments.flatMap(ls => [ls.profile.v0, ls.profile.v]);
        // let filteredSignal = convolve(signal, makeSquareKernel());
        let filteredSignal = signal;
        let analysis = calculateAnalysis(filteredSignal, 100);
        const plot = Plot.plot({
           marks: [
            // TODO: bin to integer frequencies?
            Plot.dot(analysis.frequencies, {
                x: (freq: number) => freq,
                y: (_, i: number) => analysis.magnitudes[i],
                r: 1
            }),
            Plot.crosshair(analysis.frequencies, {
                x: (freq: number) => freq,
                y: (_, i: number) => analysis.magnitudes[i],
            })
           ]
        });
        if (containerRef.current) {
            containerRef.current.append(plot);
        }
        return () => plot.remove();
    }, [lineSegments, filterSegmentIds]);
    return (
        <div ref={containerRef}>
            <div className="plot-title">Fourier Analysis</div>
        </div>
    );
}

interface InstructionWindowProps {
    lineSegments: LineSegment[];
    filterSegmentIds: SegmentIdSet;
}

function InstructionWindow({ lineSegments, filterSegmentIds } : InstructionWindowProps) {
    let filteredSegments = filterLineSegments(lineSegments, filterSegmentIds);
    let instructionsWithDups = filteredSegments.map(ls => ls.instruction);
    let instructions = instructionsWithDups.filter((inst, idx, arr) => {
        return idx === 0 || inst !== arr[idx - 1];
    });
    let listItems = instructions.map((inst: Instruction, index: number) => {
        return <li key={index}>{inst}</li>;
    });

    return (
        <div className='instruction-window'>
           <div className="plot-title">Instructions</div>
           <div>|I| = {instructions.length}, |S| = {filteredSegments.length}</div>
           <ul className="instruction-list">{listItems}</ul>
        </div>
    );
}

function App() {
    const defaultToolpath = TOOLPATH_TABLE["propellerTopScallop"];
    const defaultLimits: KinematicLimits = {
        vMax: {
            x: 300,
            y: 300,
            z: 150
        },
        aMax: {
            x: 50,
            y: 50,
            z: 25
        },
        junctionDeviation: 1e-3,
        junctionSpeed: 1e-2
    }
    const [currentToolpath, setCurrentToolpath] = useState<Toolpath | null>(defaultToolpath);
    const [lineSegments, setLineSegments] = useState<LineSegment[]>([]);
    const [filterSegmentIds, setFilterSegmentIds] = useState<SegmentIdSet>("all_segments");
    const [kinematicLimits, setKinematicLimits] = useState<KinematicLimits>(defaultLimits)
    const selectToolpath = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const toolpathName = event.target.value;
        const toolpath = TOOLPATH_TABLE[toolpathName];
        setCurrentToolpath(toolpath);
    };

    useEffect(() => {
        if (currentToolpath !== null) {
            let { fullyPlanned } = computeLineSegments(currentToolpath, kinematicLimits);
            setLineSegments(fullyPlanned);
        }
    }, [currentToolpath, kinematicLimits]);

    const handleBinSelect = (selectIds: SegmentIdSet) => {
        if (selectIds === null) {
            setFilterSegmentIds('all_segments');
        }
        else {
            setFilterSegmentIds(selectIds);
        }
    }

    return (
        <div>
            <DashboardSettings onSelect={selectToolpath}
                            onLimitChange={setKinematicLimits}></DashboardSettings>
            <DepthHistogram lineSegments={lineSegments} onBinSelect={handleBinSelect}/>
            <TrajectoryWindow 
              toolpath={currentToolpath}
              lineSegments={lineSegments}
              filterSegmentIds={filterSegmentIds}/>
              <FourierAnalysisWindow lineSegments={lineSegments}
                                     filterSegmentIds={filterSegmentIds}/>
              <InstructionWindow lineSegments={lineSegments}
                                     filterSegmentIds={filterSegmentIds}/>
        </div>
    );
}

ReactDOM.render(<App></App>, document.getElementById("app"));
