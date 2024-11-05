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
console.log(iseed);
rng = seedrandom(iseed);

const fn = fs.createWriteStream('data.out', { flags: 'w' });

write_title(fn);
write_atom(fn);
write_bond(fn);
// write_angle(fn);

fn.end();

function write_title(fn) {
    fn.write("LAMMPS data file by lmp_data\n\n");
    let n_atom = 0;
    let n_bond = 0;
    let n_angle = 0;
    let i, j;

    for (i = 0; i < n_element; i++) {
        n_atom += sys[i].n_atm;
        if (sys[i].l_bnd > 0.0) {
            n_bond += sys[i].n_mol * (sys[i].n_atm / sys[i].n_mol - 1);

            for (j = 0; j < sys[i].n_mol; j++) {
                for (let k = 0; k < sys[i].n_seg; k++) {
                    if (sys[i].segRigid[k]) {
                        n_angle += sys[i].segn[k] - 2;
                    }
                }
            }
        }
    }

    fn.write(`${n_atom} atoms\n`);
    fn.write(`${n_bond} bonds\n`);
    fn.write(`${n_angle} angles\n`);
    fn.write(`0 dihedrals\n`);
    fn.write(`0 impropers\n\n`);

    let maxatyp = 0;
    let maxx = -Number.MAX_VALUE, maxy = -Number.MAX_VALUE, maxz = -Number.MAX_VALUE;
    let minx = Number.MAX_VALUE, miny = Number.MAX_VALUE, minz = Number.MAX_VALUE;

    for (i = 0; i < n_element; i++) {
        for (j = 0; j < sys[i].n_seg; j++) {
            if (sys[i].segt[j] > maxatyp) maxatyp = sys[i].segt[j];
        }
        if (maxx < sys[i].hx) maxx = sys[i].hx;
        if (maxy < sys[i].hy) maxy = sys[i].hy;
        if (maxz < sys[i].hz) maxz = sys[i].hz;
        if (minx > sys[i].lx) minx = sys[i].lx;
        if (miny > sys[i].ly) miny = sys[i].ly;
        if (minz > sys[i].lz) minz = sys[i].lz;
    }

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
    for (i = 0; i < maxatyp; i++) {
        fn.write(`${i + 1} 1.0\n`);
    }
    fn.write(`\n`);
}

function write_atom(fn) {
    fn.write("Atoms # full\n\n");
    let i, j, k, l;
    let x = 0.0, y = 0.0, z = 0.0;
    let ox, oy, oz, theta, phi;

    let na = 0;
    let nm = 1;

    for (i = 0; i < n_element; i++) {
        for (j = 0; j < sys[i].n_mol; j++) {
            for (k = 0; k < sys[i].n_seg; k++) {
                for (l = 0; l < sys[i].segn[k]; l++) {
                    if (sys[i].segRigid[k]) {
                        if (k === 0 && l === 0) {
                            x = (sys[i].hx - sys[i].lx) * rng() + sys[i].lx;
                            y = (sys[i].hy - sys[i].ly) * rng() + sys[i].ly;
                            z = (sys[i].hz - sys[i].lz) * rng() + sys[i].lz;
                            ox = x;
                            oy = y;
                            oz = z;

                            na++;
                            fn.write(` ${na} ${nm} ${sys[i].segt[k]} `);

                            if (sys[i].segt[k] == 2)
                                fn.write(`-1 `);
                            else if (sys[i].segt[k] == 3)
                                fn.write(`1 `);
                            else
                                fn.write(`0 `);

                            fn.write(`${x} ${y} ${z}\n`);
                        }

                        let segLength = sys[i].segn[k];

                        if (k == 0) {
                            segLength = segLength - 1;
                        }

                        do {
                            theta = Math.PI * rng();
                            phi = 2.0 * Math.PI * rng();

                            x = ox + sys[i].l_bnd * (sys[i].segn[k]) * Math.cos(phi) * Math.sin(theta);
                            y = oy + sys[i].l_bnd * (sys[i].segn[k]) * Math.sin(phi) * Math.sin(theta);
                            z = oz + sys[i].l_bnd * (sys[i].segn[k]) * Math.cos(theta);
                        } while (!(x <= sys[i].hx && x >= sys[i].lx && y <= sys[i].hy && y >= sys[i].ly && z <= sys[i].hz && z >= sys[i].lz));

                        for (let m = 0; m < segLength; m++) {
                            na++;
                            fn.write(` ${na} ${nm} ${sys[i].segt[k]} `);
                            if (sys[i].segt[k] == 2)
                                fn.write(`-1 `);
                            else if (sys[i].segt[k] == 3)
                                fn.write(`1 `);
                            else
                                fn.write(`0 `);

                            x = ox + sys[i].l_bnd * Math.cos(phi) * Math.sin(theta);
                            y = oy + sys[i].l_bnd * Math.sin(phi) * Math.sin(theta);
                            z = oz + sys[i].l_bnd * Math.cos(theta);

                            ox = x;
                            oy = y;
                            oz = z;

                            fn.write(`${x} ${y} ${z}\n`);
                        }
                        break;
                    }

                    na++;
                    fn.write(` ${na} ${nm} ${sys[i].segt[k]} `);
                    if (sys[i].segt[k] == 2)
                        fn.write(`-1 `);
                    else if (sys[i].segt[k] == 3)
                        fn.write(`1 `);
                    else
                        fn.write(`0 `);

                    let flag;
                    let nitor = 0;

                    do {
                        flag = false;
                        if (sys[i].l_bnd > 0.0) {
                            if (k === 0 && l === 0) {
                                x = (sys[i].hx - sys[i].lx) * rng() + sys[i].lx;
                                y = (sys[i].hy - sys[i].ly) * rng() + sys[i].ly;
                                z = (sys[i].hz - sys[i].lz) * rng() + sys[i].lz;
                                ox = x;
                                oy = y;
                                oz = z;
                            } else {
                                theta = Math.PI * rng();
                                phi = 2.0 * Math.PI * rng();
                                x = ox + sys[i].l_bnd * Math.cos(phi) * Math.sin(theta);
                                y = oy + sys[i].l_bnd * Math.sin(phi) * Math.sin(theta);
                                z = oz + sys[i].l_bnd * Math.cos(theta);
                                if (x <= sys[i].hx && x >= sys[i].lx &&
                                    y <= sys[i].hy && y >= sys[i].ly &&
                                    z <= sys[i].hz && z >= sys[i].lz) {
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
                            x = (sys[i].hx - sys[i].lx) * rng() + sys[i].lx;
                            y = (sys[i].hy - sys[i].ly) * rng() + sys[i].ly;
                            z = (sys[i].hz - sys[i].lz) * rng() + sys[i].lz;

                            if (x <= sys[i].hx && x >= sys[i].lx &&
                                y <= sys[i].hy && y >= sys[i].ly &&
                                z <= sys[i].hz && z >= sys[i].lz) {
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
                    } while (flag);

                    fn.write(`${x} ${y} ${z}\n`);
                }
            }
            nm++;
        }
    }
    fn.write("\n");
}

function write_bond(fn) {
    fn.write("Bonds\n\n");
    let i, j, k, l;
    let na = 0; // Atom ID
    let nb = 1; // Bond ID

    for (i = 0; i < n_element; i++) {
        for (j = 0; j < sys[i].n_mol; j++) {
            for (k = 0; k < sys[i].n_seg; k++) {
                for (l = 0; l < sys[i].segn[k]; l++) {
                    na++;

                    if (sys[i].l_bnd > 0.0) {
                        if (k !== 0 || l !== 0) {
                            fn.write(` ${nb} 1 ${na - 1} ${na}\n`);
                            nb++;
                        }
                    }
                }
            }
        }
    }
    fn.write("\n");
}

function write_angle(fn) {
    fn.write("Angles\n\n");
    let i, j, k, l;
    let na = 0;
    let nb = 1;

    for (i = 0; i < n_element; i++) {
        for (j = 0; j < sys[i].n_mol; j++) {
            for (k = 0; k < sys[i].n_seg; k++) {
                for (l = 0; l < sys[i].segn[k]; l++) {
                    na++;

                    if (sys[i].l_bnd > 0.0) {
                        if (sys[i].segRigid[k]) {
                            if (l > 1) {
                                fn.write(` ${nb} 1 ${na - 2} ${na - 1} ${na}\n`);
                                nb++;
                            }
                        }
                    }
                }
            }
        }
    }
    fn.write("\n");
}
