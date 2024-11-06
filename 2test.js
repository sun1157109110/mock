const fs = require('fs');
const seedrandom = require('seedrandom');

// Read input from chain.txt
const input = fs.readFileSync('chain.txt', 'utf8');
const inputTokens = input.split(/\s+/).filter(token => token !== '');
let inputTokenIndex = 0;

function nextInput() {
    if (inputTokenIndex < inputTokens.length) {
        return inputTokens[inputTokenIndex++];
    } else {
        return null; // No more input
    }
}

class CElement {
    constructor() {
        this.segn = []; // Atom number in each segment
        this.segt = []; // Atom type in each segment
        this.segRigid = []; // Rigid or coil blocks

        console.log("Input number of segment:");
        this.n_seg = parseInt(nextInput());

        for (let i = 0; i < this.n_seg; i++) {
            this.segn.push(0);
            this.segt.push(0);
            this.segRigid.push(false);
        }
        this.n_atm = 0;

        for (let i = 0; i < this.n_seg; i++) {
            console.log(`Input the atom type of ${i + 1} segment:`);
            this.segt[i] = parseInt(nextInput());
            console.log("Input the atom number of this type:");
            this.segn[i] = parseInt(nextInput());
            this.n_atm += this.segn[i];

            if (this.segn[i] > 2) {
                let validInput = false;
                while (!validInput) {
                    console.log("Is this segment a rigid segment? (please input true or false):");
                    let boolTemp = nextInput();
                    if (boolTemp === "true" || boolTemp === "false") {
                        this.segRigid[i] = (boolTemp === "true");
                        validInput = true;
                    } else {
                        console.log("Invalid value, please input true or false!");
                    }
                }
            }
        }

        console.log("Input the number of molecules:");
        this.n_mol = parseInt(nextInput());
        this.n_atm *= this.n_mol;

        console.log("Bond length:");
        this.l_bnd = parseFloat(nextInput());

        // Initialize box dimensions
        console.log("Input lowx highx:");
        this.lx = parseFloat(nextInput());
        this.hx = parseFloat(nextInput());

        console.log("Input lowy highy:");
        this.ly = parseFloat(nextInput());
        this.hy = parseFloat(nextInput());

        console.log("Input lowz highz:");
        this.lz = parseFloat(nextInput());
        this.hz = parseFloat(nextInput());

        console.log();
    }
}

let sys = [];
let n_element;
let iseed;
let rng;

console.log("Input element number:");
n_element = parseInt(nextInput());

for (let i = 0; i < n_element; i++) {
    let tempElement = new CElement();
    sys.push(tempElement);
}

iseed = parseInt(nextInput());
console.log(`随机种子: ${iseed}`);
rng = seedrandom(iseed);

// 定义存储所有原子和键的数组
let allAtoms = [];
let allBonds = [];
let allAngles = [];

// 在盒子内生成随机位置
function generateRandomPosition(element) {
    let x = rng() * (element.hx - element.lx) + element.lx;
    let y = rng() * (element.hy - element.ly) + element.ly;
    let z = rng() * (element.hz - element.lz) + element.lz;
    return [x, y, z];
}

let currentAtomID = 1;
let currentBondID = 1;

// 生成原子并存储到 allAtoms 数组
let nm = 1; // 分子ID

for (let i = 0; i < n_element; i++) {
    let element = sys[i];
    for (let j = 0; j < element.n_mol; j++) {
        let ox, oy, oz, theta, phi;
        for (let k = 0; k < element.n_seg; k++) {
            for (let l = 0; l < element.segn[k]; l++) {
                let type = element.segt[k];

                // 根据原子类型分配电荷
                let charge = 0;
                if (type === 2) {
                    charge = -1; // 类型 2 的原子，电荷为 -1
                } else if (type === 3) {
                    charge = 1;  // 类型 3 的原子，电荷为 +1
                } else {
                    charge = 0;  // 其他类型的原子，电荷为 0
                }

                if (element.segRigid[k]) {
                    if (k === 0 && l === 0) {
                        // 初始位置
                        let pos = generateRandomPosition(element);
                        ox = pos[0];
                        oy = pos[1];
                        oz = pos[2];

                        allAtoms.push({
                            id: currentAtomID,
                            mol: nm,
                            type: type,
                            charge: charge,
                            x: ox,
                            y: oy,
                            z: oz
                        });
                        currentAtomID++;
                    }

                    let segLength = element.segn[k];
                    if (k == 0) {
                        segLength = segLength - 1;
                    }

                    for (let m = 0; m < segLength; m++) {
                        theta = Math.PI * rng();
                        phi = 2.0 * Math.PI * rng();

                        let x = ox + element.l_bnd * Math.cos(phi) * Math.sin(theta);
                        let y = oy + element.l_bnd * Math.sin(phi) * Math.sin(theta);
                        let z = oz + element.l_bnd * Math.cos(theta);

                        // 更新当前位置
                        ox = x;
                        oy = y;
                        oz = z;

                        allAtoms.push({
                            id: currentAtomID,
                            mol: nm,
                            type: type,
                            charge: charge,
                            x: x,
                            y: y,
                            z: z
                        });

                        // 添加键
                        allBonds.push({
                            id: currentBondID,
                            type: 1,
                            a1: currentAtomID - 1,
                            a2: currentAtomID
                        });
                        currentBondID++;
                        currentAtomID++;
                    }
                    break;
                } else {
                    let flag;
                    let nitor = 0;
                    let x, y, z;
                    do {
                        flag = false;
                        if (element.l_bnd > 0.0) {
                            if (k === 0 && l === 0) {
                                let pos = generateRandomPosition(element);
                                x = pos[0];
                                y = pos[1];
                                z = pos[2];
                                ox = x;
                                oy = y;
                                oz = z;
                            } else {
                                theta = Math.PI * rng();
                                phi = 2.0 * Math.PI * rng();
                                x = ox + element.l_bnd * Math.cos(phi) * Math.sin(theta);
                                y = oy + element.l_bnd * Math.sin(phi) * Math.sin(theta);
                                z = oz + element.l_bnd * Math.cos(theta);

                                if (x <= element.hx && x >= element.lx &&
                                    y <= element.hy && y >= element.ly &&
                                    z <= element.hz && z >= element.lz) {
                                    ox = x;
                                    oy = y;
                                    oz = z;
                                } else {
                                    flag = true;
                                    nitor++;
                                    if (nitor > 100) {
                                        console.error("Can't put this one!");
                                        process.exit(0);
                                    }
                                }
                            }
                        } else {
                            let pos = generateRandomPosition(element);
                            x = pos[0];
                            y = pos[1];
                            z = pos[2];
                            ox = x;
                            oy = y;
                            oz = z;
                        }
                    } while (flag);

                    allAtoms.push({
                        id: currentAtomID,
                        mol: nm,
                        type: type,
                        charge: charge,
                        x: x,
                        y: y,
                        z: z
                    });

                    // 添加键
                    if (element.l_bnd > 0.0) {
                        if (k !== 0 || l !== 0) {
                            allBonds.push({
                                id: currentBondID,
                                type: 1,
                                a1: currentAtomID - 1,
                                a2: currentAtomID
                            });
                            currentBondID++;
                        }
                    }
                    currentAtomID++;
                }
            }
        }
        nm++;
    }
}

// 计算系统的净电荷
let netCharge = allAtoms.reduce((sum, atom) => sum + atom.charge, 0);
console.log(`系统的净电荷: ${netCharge}`);

// 添加反离子以中和电荷
const counterionType = 5; // 假设反离子的类型编号为5
let counterionCharge = 0;
let numCounterions = 0;

if (netCharge !== 0) {
    if (netCharge > 0) {
        counterionCharge = -1;
    } else {
        counterionCharge = 1;
    }
    // 计算需要的反离子数量，向上取整以确保完全中和或过度中和
    numCounterions = Math.ceil(Math.abs(netCharge / counterionCharge));

    let compensatedCharge = numCounterions * counterionCharge;
    console.log(`需要补偿的电荷量: ${-netCharge}`);
    console.log(`实际补偿电荷量: ${compensatedCharge}`);
    console.log(`添加 ${numCounterions} 个类型 ${counterionType} 的反离子，电荷为 ${counterionCharge} each`);

    // 添加反离子
    for (let i = 0; i < numCounterions; i++) {
        let pos = generateRandomPosition(sys[0]); // 使用第一个元素的盒子尺寸
        allAtoms.push({
            id: currentAtomID,
            mol: nm,
            type: counterionType,
            charge: counterionCharge,
            x: pos[0],
            y: pos[1],
            z: pos[2]
        });
        currentAtomID++;
        nm++;
    }

    // 重新计算系统的净电荷
    netCharge = allAtoms.reduce((sum, atom) => sum + atom.charge, 0);
    console.log(`添加反离子后的系统净电荷: ${netCharge}`);
}

// 计算盒子的体积
let minx = sys[0].lx;
let maxx = sys[0].hx;
let miny = sys[0].ly;
let maxy = sys[0].hy;
let minz = sys[0].lz;
let maxz = sys[0].hz;

let boxVolume = (maxx - minx) * (maxy - miny) * (maxz - minz);
console.log(`盒子体积: ${boxVolume}`);

// 计算目标珠子数（密度为1）
let targetBeadCount = Math.round(boxVolume * 1); // 密度=1
console.log(`设定总珠子数（密度=1）: ${targetBeadCount}`);

let currentBeadCount = allAtoms.length;
console.log(`当前总珠子数（包括反离子）: ${currentBeadCount}`);

// let numWaterBeads = targetBeadCount - currentBeadCount;

// const waterType = 6; // 假设水珠子的类型编号为6

// if (numWaterBeads > 0) {
//     console.log(`添加 ${numWaterBeads} 个类型 ${waterType} 的水珠子，以达到珠子密度为1`);

//     // 添加水珠子
//     for (let i = 0; i < numWaterBeads; i++) {
//         let pos = generateRandomPosition(sys[0]);
//         allAtoms.push({
//             id: currentAtomID,
//             mol: nm,
//             type: waterType,
//             charge: 0,
//             x: pos[0],
//             y: pos[1],
//             z: pos[2]
//         });
//         currentAtomID++;
//         nm++;
//     }
// } else {
//     console.log(`当前珠子数已达到或超过 ${targetBeadCount}，无需添加水珠子。`);
// }

// 更新最大原子类型编号
let maxatyp = Math.max(counterionType, /* waterType, */ ...sys.flatMap(e => e.segt));

// 写入到文件
const fn = fs.createWriteStream('data.out', { flags: 'w' });

write_title(fn);
write_atom(fn);
write_bond(fn);
// write_angle(fn);

fn.end();

function write_title(fn) {
    fn.write("LAMMPS data file by lmp_data\n\n");
    let n_atom = allAtoms.length;
    let n_bond = allBonds.length;
    let n_angle = 0; // 如果需要角度信息，可以计算并更新

    fn.write(`${n_atom} atoms\n`);
    fn.write(`${n_bond} bonds\n`);
    fn.write(`${n_angle} angles\n`);
    fn.write(`0 dihedrals\n`);
    fn.write(`0 impropers\n\n`);

    fn.write(`${maxatyp} atom types\n`);
    fn.write(`1 bond types\n`);
    fn.write(`0 angle types\n`);
    fn.write(`0 dihedral types\n`);
    fn.write(`0 improper types\n`);
    fn.write(`10 extra bond per atom\n\n`);

    fn.write(`${minx} ${maxx} xlo xhi\n`);
    fn.write(`${miny} ${maxy} ylo yhi\n`);
    fn.write(`${minz} ${maxz} zlo zhi\n\n`);

    fn.write(`Masses\n\n`);
    for (let i = 1; i <= maxatyp; i++) {
        // if (i === counterionType) {
        //     fn.write(`${i} 22.98976928\n`); // 例如Na+的原子量
        // } else if (i === waterType) {
        //     fn.write(`${i} 18.01528\n`); // 水的摩尔质量
        // } else {
            fn.write(`${i} 1.0\n`); // 其他类型的质量
        // }
    }
    fn.write(`\n`);
}

function write_atom(fn) {
    fn.write("Atoms # full\n\n");
    for (let atom of allAtoms) {
        fn.write(` ${atom.id} ${atom.mol} ${atom.type} ${atom.charge} ${atom.x} ${atom.y} ${atom.z}\n`);
    }
    fn.write("\n");
}

function write_bond(fn) {
    fn.write("Bonds\n\n");
    for (let bond of allBonds) {
        fn.write(` ${bond.id} ${bond.type} ${bond.a1} ${bond.a2}\n`);
    }
    fn.write("\n");
}

function write_angle(fn) {
    // 如果需要实现角度的写入，可以在此添加代码
}
