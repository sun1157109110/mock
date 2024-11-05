const fs = require('fs');
const seedrandom = require('seedrandom');

// 从 chain.txt 文件中读取所有输入数据
const input = fs.readFileSync('chain.txt', 'utf8');
// 使用正则表达式分割输入，过滤掉空白字符
const inputTokens = input.split(/\s+/).filter(token => token !== '');
let inputTokenIndex = 0;

// 获取下一个输入令牌
function nextInput() {
    if (inputTokenIndex < inputTokens.length) {
        return inputTokens[inputTokenIndex++];
    } else {
        return null; // 没有更多输入
    }
}

// 定义 CElement 类，表示一个元素（分子类型对应一个盒子）
class CElement {
    constructor(elementIndex) {
        this.segn = [];      // 每个片段中的原子数量
        this.segt = [];      // 每个片段的原子类型
        this.segRigid = [];  // 每个片段是否为刚性片段

        console.log(`\n请输入第 ${elementIndex + 1} 个元素的片段数量:`);
        this.n_seg = parseInt(nextInput());

        // 初始化每个片段的信息
        for (let i = 0; i < this.n_seg; i++) {
            this.segn.push(0);
            this.segt.push(0);
            this.segRigid.push(false);
        }
        this.n_atm = 0; // 总原子数量初始化

        // 逐个片段输入原子类型和数量，以及是否为刚性片段
        for (let i = 0; i < this.n_seg; i++) {
            console.log(`请输入第 ${i + 1} 个片段的原子类型:`);
            this.segt[i] = parseInt(nextInput());
            console.log(`请输入第 ${i + 1} 个片段的原子数量:`);
            this.segn[i] = parseInt(nextInput());
            this.n_atm += this.segn[i];

            // 如果原子数量大于2，询问是否为刚性片段
            if (this.segn[i] > 2) {
                let validInput = false;
                while (!validInput) {
                    console.log(`第 ${i + 1} 个片段是否为刚性片段？（请输入 true 或 false）:`);
                    let boolTemp = nextInput();
                    if (boolTemp === "true" || boolTemp === "false") {
                        this.segRigid[i] = (boolTemp === "true");
                        validInput = true;
                    } else {
                        console.log("输入无效，请输入 true 或 false！");
                    }
                }
            }
        }

        console.log(`请输入第 ${elementIndex + 1} 个元素的分子数量:`);
        this.n_mol = parseInt(nextInput());
        this.n_atm *= this.n_mol; // 总原子数乘以分子数量

        console.log(`请输入第 ${elementIndex + 1} 个元素的键长:`);
        this.l_bnd = parseFloat(nextInput());

        // 初始化盒子尺寸
        console.log(`请输入第 ${elementIndex + 1} 个元素的 x 方向的 low 和 high:`);
        this.lx = parseFloat(nextInput());
        this.hx = parseFloat(nextInput());

        console.log(`请输入第 ${elementIndex + 1} 个元素的 y 方向的 low 和 high:`);
        this.ly = parseFloat(nextInput());
        this.hy = parseFloat(nextInput());

        console.log(`请输入第 ${elementIndex + 1} 个元素的 z 方向的 low 和 high:`);
        this.lz = parseFloat(nextInput());
        this.hz = parseFloat(nextInput());

        console.log();
    }
}

// 初始化系统数组和其他变量
let sys = [];
let n_element;
let iseed;
let rng;

// 读取元素数量
console.log("请输入元素数量:");
n_element = parseInt(nextInput());

// 逐个元素创建 CElement 实例并添加到系统中
for (let i = 0; i < n_element; i++) {
    let tempElement = new CElement(i);
    sys.push(tempElement);
}

// 检查所有元素的盒子尺寸是否一致
let firstBox = {
    xlo: sys[0].lx,
    xhi: sys[0].hx,
    ylo: sys[0].ly,
    yhi: sys[0].hy,
    zlo: sys[0].lz,
    zhi: sys[0].hz
};
let consistentBox = sys.every(element => 
    element.lx === firstBox.xlo &&
    element.hx === firstBox.xhi &&
    element.ly === firstBox.ylo &&
    element.hy === firstBox.yhi &&
    element.lz === firstBox.zlo &&
    element.hz === firstBox.zhi
);

if (!consistentBox) {
    console.error("所有元素的盒子尺寸不一致，请确保所有元素的盒子尺寸相同。");
    process.exit(1);
}

let box = {
    xlo: firstBox.xlo,
    xhi: firstBox.xhi,
    ylo: firstBox.ylo,
    yhi: firstBox.yhi,
    zlo: firstBox.zlo,
    zhi: firstBox.zhi
};

// 读取随机种子
iseed = parseInt(nextInput());
console.log(`随机种子: ${iseed}`);
rng = seedrandom(iseed);

// 初始化数组以存储所有原子、键和角的信息
let allAtoms = [];
let allBonds = [];
let allAngles = [];

// 获取当前系统中最大的原子类型编号（不包括反离子和水）
function getMaxAtomType() {
    let maxType = 0;
    for (let i = 0; i < sys.length; i++) {
        for (let j = 0; j < sys[i].n_seg; j++) {
            if (sys[i].segt[j] > maxType) {
                maxType = sys[i].segt[j];
            }
        }
    }
    return maxType;
}

let maxType = getMaxAtomType();

// 设定反离子类型为 type5，水为 type6
const counterionType = 5;
const waterType = 6;

// 确保反离子和水类型编号不与现有类型冲突
if (maxType >= counterionType) {
    console.error(`反离子类型编号（${counterionType}）与现有类型编号冲突。请调整反离子类型编号。`);
    process.exit(1);
}
if (maxType >= waterType) {
    console.error(`水珠子类型编号（${waterType}）与现有类型编号冲突。请调整水珠子类型编号。`);
    process.exit(1);
}

// 处理所有原子并存储在 allAtoms 数组中
let currentAtomID = 1;    // 原子ID初始化
let currentBondID = 1;    // 键ID初始化
let currentAngleID = 1;   // 角ID初始化

// 在盒子内生成随机位置
function generateRandomPosition() {
    let x = rng() * (box.xhi - box.xlo) + box.xlo;
    let y = rng() * (box.yhi - box.ylo) + box.ylo;
    let z = rng() * (box.zhi - box.zlo) + box.zlo;
    return [x, y, z];
}

// 生成原子、键和角的信息
for (let i = 0; i < sys.length; i++) {
    let element = sys[i];
    for (let j = 0; j < element.n_mol; j++) {
        let ox, oy, oz; // 当前原子的坐标
        for (let k = 0; k < element.n_seg; k++) {
            for (let l = 0; l < element.segn[k]; l++) {
                let type = element.segt[k];
                let charge;
                // 根据类型分配电荷，这里根据示例：
                if (type === 2) {
                    charge = -1.0; // 示例：类型2带负电荷
                } else if (type === 3) {
                    charge = 1.0;  // 示例：类型3带正电荷（如表面活性剂头部）
                } else {
                    charge = 0.0;  // 其他类型为中性
                }

                // 如果是刚性片段的第一个原子
                if (element.segRigid[k] && (k === 0 && l === 0)) {
                    // 生成初始原子位置
                    let pos = generateRandomPosition();
                    ox = pos[0];
                    oy = pos[1];
                    oz = pos[2];

                    // 添加原子到 allAtoms 数组
                    allAtoms.push({
                        id: currentAtomID,
                        mol: i * element.n_mol + j + 1, // 分子ID，确保唯一
                        type: type,
                        charge: charge,
                        x: ox,
                        y: oy,
                        z: oz
                    });
                    currentAtomID++;

                    // 为刚性片段添加键和角
                    for (let m = 1; m < element.segn[k]; m++) {
                        let theta = Math.PI * rng();
                        let phi = 2.0 * Math.PI * rng();
                        let x = ox + element.l_bnd * Math.cos(phi) * Math.sin(theta);
                        let y = oy + element.l_bnd * Math.sin(phi) * Math.sin(theta);
                        let z = oz + element.l_bnd * Math.cos(theta);

                        // 确保新位置在盒子内
                        if (x < box.xlo || x > box.xhi ||
                            y < box.ylo || y > box.yhi ||
                            z < box.zlo || z > box.zhi) {
                            // 如果超出边界，重新生成位置
                            m--;
                            continue;
                        }

                        // 添加新原子
                        allAtoms.push({
                            id: currentAtomID,
                            mol: i * element.n_mol + j + 1, // 分子ID
                            type: type,
                            charge: charge,
                            x: x,
                            y: y,
                            z: z
                        });

                        // 添加键信息
                        allBonds.push({
                            id: currentBondID,
                            type: 1, // 假设键类型为1
                            a1: currentAtomID - 1,
                            a2: currentAtomID
                        });
                        currentBondID++;

                        // 添加角信息（如果适用）
                        if (m >= 2 && element.segRigid[k]) {
                            allAngles.push({
                                id: currentAngleID,
                                type: 1, // 假设角类型为1
                                a1: currentAtomID - 2,
                                a2: currentAtomID - 1,
                                a3: currentAtomID
                            });
                            currentAngleID++;
                        }

                        // 更新当前位置为下一个原子的起点
                        ox = x;
                        oy = y;
                        oz = z;

                        currentAtomID++;
                    }

                } else {
                    // 非刚性片段或非初始原子
                    let pos = generateRandomPosition();
                    allAtoms.push({
                        id: currentAtomID,
                        mol: i * element.n_mol + j + 1, // 分子ID
                        type: type,
                        charge: charge,
                        x: pos[0],
                        y: pos[1],
                        z: pos[2]
                    });

                    // 如果不是该分子的第一个原子，添加键
                    if (currentAtomID > 1) { // 确保不是第一个原子
                        allBonds.push({
                            id: currentBondID,
                            type: 1, // 假设键类型为1
                            a1: currentAtomID - 1,
                            a2: currentAtomID
                        });
                        currentBondID++;
                    }

                    currentAtomID++;
                }
            }
        }
    }
}

// 计算系统的净电荷
let netCharge = allAtoms.reduce((acc, atom) => acc + atom.charge, 0.0);
console.log(`系统的净电荷: ${netCharge}`);

// 设定总珠子数为盒子体积 * 密度（密度=1）
let boxVolume = (box.xhi - box.xlo) * (box.yhi - box.ylo) * (box.zhi - box.zlo);
let totalBeads = Math.round(boxVolume * 1); // 密度=1
console.log(`盒子体积: ${boxVolume}`);
console.log(`设定总珠子数（密度=1）: ${totalBeads}`);

// 判断是否需要添加反离子
let numCounterions = 0;
let totalCompensatedCharge = 0.0;

if (netCharge !== 0) {
    let counterionCharge;
    if (netCharge < 0) {
        // 需要正反离子，例如 Na+
        counterionCharge = 1.0;
    } else {
        // 需要负反离子，例如 Cl-
        counterionCharge = -1.0;
    }

    // 计算需要添加的反离子数量
    numCounterions = Math.round(Math.abs(netCharge) / Math.abs(counterionCharge));
    totalCompensatedCharge = numCounterions * counterionCharge;
    console.log(`需要补偿的电荷量: ${Math.abs(netCharge)}（实际补偿电荷量: ${Math.abs(totalCompensatedCharge)}）`);
    console.log(`添加 ${numCounterions} 个类型 ${counterionType} 的反离子，电荷为 ${counterionCharge} each`);

    // 检查位置是否有效（无重叠）
    function isValidPosition(x, y, z, minDist = 1.0) {
        for (let atom of allAtoms) {
            let dx = x - atom.x;
            let dy = y - atom.y;
            let dz = z - atom.z;
            let distSq = dx * dx + dy * dy + dz * dz;
            if (distSq < minDist * minDist) {
                return false;
            }
        }
        return true;
    }

    // 在盒子内随机添加反离子，确保不与现有原子重叠
    for (let i = 0; i < numCounterions; i++) {
        let x, y, z;
        let attempts = 0;
        const maxAttempts = 1000;
        do {
            x = rng() * (box.xhi - box.xlo) + box.xlo;
            y = rng() * (box.yhi - box.ylo) + box.ylo;
            z = rng() * (box.zhi - box.zlo) + box.zlo;
            attempts++;
            if (attempts > maxAttempts) {
                console.error("在1000次尝试后，无法无重叠地放置反离子。");
                break;
            }
        } while (!isValidPosition(x, y, z));

        if (attempts <= maxAttempts) {
            allAtoms.push({
                id: currentAtomID,
                mol: n_element * Math.max(...sys.map(e => e.n_mol)) + i + 1, // 分子ID，确保唯一
                type: counterionType,
                charge: counterionCharge,
                x: x,
                y: y,
                z: z
            });
            currentAtomID++;
        }
    }

    // 更新最大类型编号
    if (numCounterions > 0) {
        maxType = Math.max(maxType, counterionType);
    }

    // 重新计算系统的净电荷
    let newNetCharge = allAtoms.reduce((acc, atom) => acc + atom.charge, 0.0);
    console.log(`添加反离子后的系统净电荷: ${newNetCharge}`);
}

// 计算当前总珠子数（包括反离子）
let currentBeadCount = allAtoms.length;
console.log(`当前总珠子数（包括反离子）: ${currentBeadCount}`);

// 设定剩余的珠子为水珠子（type6），无需检测是否重叠
let numWaterBeads = Math.round(totalBeads - currentBeadCount);
if (numWaterBeads > 0) {
    console.log(`添加 ${numWaterBeads} 个类型 ${waterType} 的水珠子，以达到珠子密度为1`);

    // 在盒子内随机添加水珠子，无需检查重叠
    for (let i = 0; i < numWaterBeads; i++) {
        let pos = generateRandomPosition();
        allAtoms.push({
            id: currentAtomID,
            mol: n_element * Math.max(...sys.map(e => e.n_mol)) + numCounterions + i + 1, // 分子ID，确保唯一
            type: waterType,
            charge: 0.0, // 水珠子电荷为0
            x: pos[0],
            y: pos[1],
            z: pos[2]
        });
        currentAtomID++;
    }

    // 更新最大类型编号
    maxType = Math.max(maxType, waterType);
} else {
    console.log(`当前珠子数已达到或超过 ${totalBeads}，无需添加水珠子。`);
}

// 创建并写入 data.out 文件
const fn = fs.createWriteStream('data.out', { flags: 'w' });

// 写入标题和计数信息
write_title(fn);
// 写入 Atoms 部分
write_atom(fn);
// 写入 Bonds 部分
write_bond(fn);
// 写入 Angles 部分
// write_angle(fn);
// 如果需要，可以取消注释以下部分来写入 Dihedrals 和 Impropers
// write_dihedral(fn);
// write_improper(fn);

fn.end();

// 函数：写入标题和计数信息
function write_title(fn) {
    fn.write("LAMMPS data file by lmp_data with counterions and water\n\n");

    let n_atom = allAtoms.length;
    let n_bond = allBonds.length;
    let n_angle = allAngles.length;
    let n_dihedral = 0; // 如果使用二面角，可以修改
    let n_improper = 0; // 如果使用非键合角，可以修改

    fn.write(`${n_atom} atoms\n`);
    fn.write(`${n_bond} bonds\n`);
    fn.write(`${n_angle} angles\n`);
    fn.write(`0 dihedrals\n`);
    fn.write(`0 impropers\n\n`);

    // 确定最大的原子类型编号
    let maxatyp = maxType;

    // 定义盒子边界（根据 chain.txt 的输入）
    fn.write(`${maxatyp} atom types\n`);
    fn.write(`1 bond types\n`);
    fn.write(`1 angle types\n`); // 假设只有一种角类型
    fn.write(`0 dihedral types\n`);
    fn.write(`0 improper types\n\n`);

    // 每个原子额外的键数量（可选，根据需要设置）
    fn.write(`10 extra bond per atom\n\n`);

    // 盒子尺寸
    fn.write(`${box.xlo} ${box.xhi} xlo xhi\n`);
    fn.write(`${box.ylo} ${box.yhi} ylo yhi\n`);
    fn.write(`${box.zlo} ${box.zhi} zlo zhi\n\n`);

    // 写入 Masses 部分
    fn.write(`Masses\n\n`);
    for (let i = 1; i <= maxatyp; i++) {
        if (i === counterionType) {
            // 设定反离子的质量，根据具体反离子调整
            fn.write(`${i} 22.98976928\n`); // 例如 Na+ 的摩尔质量
        } else if (i === waterType) {
            // 设定水珠子的质量
            fn.write(`${i} 18.01528\n`); // 水的摩尔质量
        } else {
            // 根据类型编号分配其他原子的质量，这里假设为1.0
            fn.write(`${i} 1.0\n`);
        }
    }
    fn.write(`\n`);
}

// 函数：写入 Atoms 部分
function write_atom(fn) {
    fn.write("Atoms # full\n\n");
    for (let atom of allAtoms) {
        fn.write(`${atom.id} ${atom.mol} ${atom.type} ${atom.charge} ${atom.x.toFixed(5)} ${atom.y.toFixed(5)} ${atom.z.toFixed(5)}\n`);
    }
    fn.write("\n");
}

// 函数：写入 Bonds 部分
function write_bond(fn) {
    fn.write("Bonds\n\n");
    for (let bond of allBonds) {
        fn.write(`${bond.id} ${bond.type} ${bond.a1} ${bond.a2}\n`);
    }
    fn.write("\n");
}

// 函数：写入 Angles 部分
function write_angle(fn) {
    fn.write("Angles\n\n");
    for (let angle of allAngles) {
        fn.write(`${angle.id} ${angle.type} ${angle.a1} ${angle.a2} ${angle.a3}\n`);
    }
    fn.write("\n");
}

// 可选：函数 - 写入 Dihedrals 部分
/*
function write_dihedral(fn) {
    fn.write("Dihedrals\n\n");
    // 在这里添加二面角的写入逻辑
    fn.write("\n");
}
*/

// 可选：函数 - 写入 Impropers 部分
/*
function write_improper(fn) {
    fn.write("Impropers\n\n");
    // 在这里添加非键合角的写入逻辑
    fn.write("\n");
}
*/
