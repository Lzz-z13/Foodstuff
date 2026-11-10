// Gerador de QR Code em JavaScript puro (modo byte, versões 1 a 10).
// Converte um texto em uma imagem PNG (data URL de base64) direto no
// navegador, sem dependências externas. Usado para transformar o token
// da mesa em um QR Code que pode ser impresso e fixado na mesa física.

const ECC_LEVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

// Tabela ISO/IEC 18004 dos blocos de Reed-Solomon por versão e nível:
// [correção por bloco, blocos do grupo 1, dados do grupo 1,
//  blocos do grupo 2, dados do grupo 2]
const RS_BLOCKS = {
  1: { L: [7, 1, 19], M: [10, 1, 16], Q: [13, 1, 13], H: [17, 1, 9] },
  2: { L: [10, 1, 34], M: [16, 1, 28], Q: [22, 1, 22], H: [28, 1, 16] },
  3: { L: [15, 1, 55], M: [26, 1, 44], Q: [18, 2, 17], H: [22, 2, 13] },
  4: { L: [20, 1, 80], M: [18, 2, 32], Q: [26, 2, 24], H: [16, 4, 9] },
  5: {
    L: [26, 1, 108],
    M: [24, 2, 43],
    Q: [18, 2, 15, 2, 16],
    H: [22, 2, 11, 2, 12],
  },
  6: { L: [18, 2, 68], M: [16, 4, 27], Q: [24, 4, 19], H: [28, 4, 15] },
  7: {
    L: [20, 2, 78],
    M: [18, 4, 31],
    Q: [18, 2, 14, 4, 15],
    H: [26, 4, 13, 1, 14],
  },
  8: {
    L: [24, 2, 97],
    M: [22, 2, 38, 2, 39],
    Q: [22, 4, 18, 2, 19],
    H: [26, 4, 14, 2, 15],
  },
  9: {
    L: [30, 2, 116],
    M: [22, 3, 36, 2, 37],
    Q: [20, 4, 16, 4, 17],
    H: [24, 4, 12, 4, 13],
  },
  10: {
    L: [18, 2, 68, 2, 69],
    M: [26, 4, 43, 1, 44],
    Q: [24, 6, 19, 2, 20],
    H: [28, 6, 15, 2, 16],
  },
};

// Coordenadas (linha e coluna) dos padrões de alinhamento por versão.
const ALIGNMENT_COORDS = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};

// ---- Campo de Galois GF(256), polinômio primitivo 0x11D ----

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

(function initGaloisField() {
  let value = 1;

  for (let exponent = 0; exponent < 255; exponent += 1) {
    EXP[exponent] = value;
    LOG[value] = exponent;

    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }

  for (let exponent = 255; exponent < 512; exponent += 1) {
    EXP[exponent] = EXP[exponent - 255];
  }
})();

function galoisMultiply(a, b) {
  if (a === 0 || b === 0) {
    return 0;
  }

  return EXP[LOG[a] + LOG[b]];
}

// ---- Buffer de bits ----

function createBitBuffer() {
  return { bytes: [], length: 0 };
}

function putBit(buffer, bit) {
  const byteIndex = buffer.length >>> 3;

  if (buffer.bytes.length <= byteIndex) {
    buffer.bytes.push(0);
  }

  if (bit) {
    buffer.bytes[byteIndex] |= 0x80 >>> (buffer.length & 7);
  }

  buffer.length += 1;
}

function putBits(buffer, value, count) {
  for (let shift = count - 1; shift >= 0; shift -= 1) {
    putBit(buffer, ((value >>> shift) & 1) === 1);
  }
}

// ---- Codificação dos dados (modo byte) ----

function totalDataCodewords(blocks) {
  const [, groupBlocks, groupData, extraBlocks = 0, extraData = 0] = blocks;
  return groupBlocks * groupData + extraBlocks * extraData;
}

function pickVersion(bytes, level) {
  for (let version = 1; version <= 10; version += 1) {
    const dataCodewords = totalDataCodewords(RS_BLOCKS[version][level]);
    // Indicador de modo (4 bits) + contagem (8 bits nas versões 1-9,
    // 16 bits a partir da versão 10).
    const countBits = version <= 9 ? 8 : 16;

    if (4 + countBits + bytes.length * 8 <= dataCodewords * 8) {
      return version;
    }
  }

  throw new Error("Texto longo demais para gerar o QR Code.");
}

function encodeDataCodewords(bytes, version, level) {
  const dataCodewords = totalDataCodewords(RS_BLOCKS[version][level]);
  const countBits = version <= 9 ? 8 : 16;

  const buffer = createBitBuffer();
  putBits(buffer, 0b0100, 4); // indicador do modo byte
  putBits(buffer, bytes.length, countBits);
  for (const byte of bytes) {
    putBits(buffer, byte, 8);
  }

  // Terminador (até 4 bits zero) e alinhamento ao byte
  const terminator = Math.max(0, Math.min(4, dataCodewords * 8 - buffer.length));
  if (terminator > 0) {
    putBits(buffer, 0, terminator);
  }
  while (buffer.length % 8 !== 0) {
    putBit(buffer, false);
  }

  // Bytes de preenchimento alternados até a capacidade
  const padding = [0xec, 0x11];
  for (let index = 0; buffer.bytes.length < dataCodewords; index += 1) {
    buffer.bytes.push(padding[index % 2]);
  }

  return buffer.bytes;
}

// ---- Reed-Solomon ----

function rsGeneratorPolynomial(degree) {
  let poly = [1];

  for (let exponent = 0; exponent < degree; exponent += 1) {
    const next = new Array(poly.length + 1).fill(0);

    for (let index = 0; index < poly.length; index += 1) {
      next[index] ^= poly[index];
      next[index + 1] ^= galoisMultiply(poly[index], EXP[exponent]);
    }

    poly = next;
  }

  return poly;
}

function rsEncode(data, ecLength) {
  const generator = rsGeneratorPolynomial(ecLength);
  const remainder = [...data, ...new Array(ecLength).fill(0)];

  for (let i = 0; i < data.length; i += 1) {
    const factor = remainder[i];
    if (factor === 0) {
      continue;
    }

    for (let j = 0; j < generator.length; j += 1) {
      remainder[i + j] ^= galoisMultiply(generator[j], factor);
    }
  }

  return remainder.slice(data.length);
}

function structureFinalMessage(dataCodewords, blocks) {
  const [ecLength, groupBlocks, groupData, extraBlocks = 0, extraData = 0] =
    blocks;

  const dataBlocks = [];
  let offset = 0;

  for (let i = 0; i < groupBlocks; i += 1) {
    dataBlocks.push(dataCodewords.slice(offset, offset + groupData));
    offset += groupData;
  }
  for (let i = 0; i < extraBlocks; i += 1) {
    dataBlocks.push(dataCodewords.slice(offset, offset + extraData));
    offset += extraData;
  }

  const ecBlocks = dataBlocks.map((block) => rsEncode(block, ecLength));

  // Intercala os dados e depois os codewords de correção
  const final = [];
  const maxDataLength = Math.max(groupData, extraData);

  for (let i = 0; i < maxDataLength; i += 1) {
    for (const block of dataBlocks) {
      if (i < block.length) {
        final.push(block[i]);
      }
    }
  }
  for (let i = 0; i < ecLength; i += 1) {
    for (const ecBlock of ecBlocks) {
      final.push(ecBlock[i]);
    }
  }

  return final;
}

// ---- BCH para as informações de formato e versão ----

function bchRemainder(value, generator) {
  const generatorDegree = 31 - Math.clz32(generator);
  const valueDegree = 31 - Math.clz32(value);
  let remainder = value;

  for (let shift = valueDegree - generatorDegree; shift >= 0; shift -= 1) {
    if ((remainder >>> (shift + generatorDegree)) & 1) {
      remainder ^= generator << shift;
    }
  }

  return remainder;
}

function formatInformationBits(level, mask) {
  const data = (ECC_LEVEL_BITS[level] << 3) | mask;
  const raw = (data << 10) | bchRemainder(data << 10, 0x537);
  return raw ^ 0x5412;
}

function versionInformationBits(version) {
  return (version << 12) | bchRemainder(version << 12, 0x1f25);
}

// ---- Matriz ----

function createMatrix(version) {
  const size = version * 4 + 17;

  return {
    version,
    size,
    modules: Array.from({ length: size }, () => new Array(size).fill(null)),
    // Módulos de função (finders, timing, formato...) não recebem dados
    // nem máscara.
    reserved: Array.from({ length: size }, () =>
      new Array(size).fill(false),
    ),
  };
}

function setFunctionModule(matrix, row, col, dark) {
  matrix.modules[row][col] = dark;
  matrix.reserved[row][col] = true;
}

function placeFinderPattern(matrix, row, col) {
  // Padrão de 7x7 + separador de 1 módulo ao redor
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const targetRow = row + r;
      const targetCol = col + c;

      if (
        targetRow < 0 ||
        targetRow >= matrix.size ||
        targetCol < 0 ||
        targetCol >= matrix.size
      ) {
        continue;
      }

      const isFinder =
        r >= 0 &&
        r <= 6 &&
        c >= 0 &&
        c <= 6 &&
        (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));

      setFunctionModule(matrix, targetRow, targetCol, isFinder);
    }
  }
}

function placeTimingPatterns(matrix) {
  for (let i = 8; i < matrix.size - 8; i += 1) {
    if (!matrix.reserved[i][6]) {
      setFunctionModule(matrix, i, 6, i % 2 === 0);
    }
    if (!matrix.reserved[6][i]) {
      setFunctionModule(matrix, 6, i, i % 2 === 0);
    }
  }
}

function placeAlignmentPatterns(matrix) {
  const coords = ALIGNMENT_COORDS[matrix.version];
  const last = coords.length - 1;
  if (last < 1) {
    return;
  }

  for (let r = 0; r <= last; r += 1) {
    for (let c = 0; c <= last; c += 1) {
      // Combinações sobre os padrões de busca são ignoradas
      if ((r === 0 && c === 0) || (r === 0 && c === last) || (r === last && c === 0)) {
        continue;
      }

      const centerRow = coords[r];
      const centerCol = coords[c];

      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const distance = Math.max(Math.abs(dr), Math.abs(dc));
          setFunctionModule(matrix, centerRow + dr, centerCol + dc, distance !== 1);
        }
      }
    }
  }
}

function formatPositions(size) {
  const positions = [];

  for (let i = 0; i < 15; i += 1) {
    if (i < 6) {
      positions.push([i, 8]);
    } else if (i < 8) {
      positions.push([i + 1, 8]);
    } else {
      positions.push([size - 15 + i, 8]);
    }

    if (i < 8) {
      positions.push([8, size - 1 - i]);
    } else if (i === 8) {
      positions.push([8, 7]);
    } else {
      positions.push([8, 14 - i]);
    }
  }

  return positions;
}

function placeFormatInformation(matrix, level, mask) {
  const bits = formatInformationBits(level, mask);

  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;
    const positions = formatPositions(matrix.size);

    setFunctionModule(matrix, positions[i * 2][0], positions[i * 2][1], dark);
    setFunctionModule(
      matrix,
      positions[i * 2 + 1][0],
      positions[i * 2 + 1][1],
      dark,
    );
  }

  // Módulo escuro fixo
  setFunctionModule(matrix, matrix.size - 8, 8, true);
}

function placeVersionInformation(matrix) {
  if (matrix.version < 7) {
    return;
  }

  const bits = versionInformationBits(matrix.version);

  for (let i = 0; i < 18; i += 1) {
    const dark = ((bits >>> i) & 1) === 1;

    setFunctionModule(matrix, Math.floor(i / 3), matrix.size - 11 + (i % 3), dark);
    setFunctionModule(matrix, matrix.size - 11 + (i % 3), Math.floor(i / 3), dark);
  }
}

function placeFunctionPatterns(matrix) {
  const { size } = matrix;

  placeFinderPattern(matrix, 0, 0);
  placeFinderPattern(matrix, size - 7, 0);
  placeFinderPattern(matrix, 0, size - 7);
  placeTimingPatterns(matrix);
  placeAlignmentPatterns(matrix);

  // Reserva as posições da informação de formato antes dos dados
  for (const [row, col] of formatPositions(size)) {
    matrix.reserved[row][col] = true;
    matrix.modules[row][col] = false;
  }
  setFunctionModule(matrix, size - 8, 8, true);

  placeVersionInformation(matrix);
}

function placeData(matrix, codewords) {
  const { size } = matrix;
  const totalBits = codewords.length * 8;
  let bitIndex = 0;

  // Preenche em faixas de 2 colunas, da direita para a esquerda,
  // alternando de baixo para cima e de cima para baixo. A faixa que
  // cairia na coluna do timing (6) é deslocada.
  for (let right = size - 1; right >= 1; right -= 2) {
    const col = right === 6 ? 5 : right;
    const upward = ((col + 1) & 2) === 0;

    for (let step = 0; step < size; step += 1) {
      const row = upward ? size - 1 - step : step;

      for (let offset = 0; offset < 2; offset += 1) {
        const targetCol = col - offset;
        if (matrix.reserved[row][targetCol]) {
          continue;
        }

        const dark =
          bitIndex < totalBits
            ? ((codewords[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1) === 1
            : false; // bits restantes da matriz são claros
        matrix.modules[row][targetCol] = dark;
        bitIndex += 1;
      }
    }
  }
}

// ---- Máscara ----

const MASK_FUNCTIONS = [
  (row, col) => (row + col) % 2 === 0,
  (row, col) => row % 2 === 0,
  (row, col) => col % 3 === 0,
  (row, col) => (row + col) % 3 === 0,
  (row, col) => (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0,
  (row, col) => ((row * col) % 2) + ((row * col) % 3) === 0,
  (row, col) => (((row * col) % 2) + ((row * col) % 3)) % 2 === 0,
  (row, col) => (((row + col) % 2) + ((row * col) % 3)) % 2 === 0,
];

function applyMask(matrix, maskIndex) {
  const mask = MASK_FUNCTIONS[maskIndex];

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.reserved[row][col]) {
        continue;
      }
      if (mask(row, col)) {
        matrix.modules[row][col] = !matrix.modules[row][col];
      }
    }
  }
}

function penaltyScore(matrix) {
  const { size, modules } = matrix;
  let score = 0;

  // N1: sequências de 5+ módulos iguais; N3: padrão semelhante ao finder
  for (const vertical of [false, true]) {
    for (let i = 0; i < size; i += 1) {
      const line = [];
      for (let j = 0; j < size; j += 1) {
        line.push(vertical ? modules[j][i] : modules[i][j]);
      }

      let run = 1;
      for (let j = 1; j < size; j += 1) {
        if (line[j] === line[j - 1]) {
          run += 1;
        } else {
          if (run >= 5) {
            score += 3 + (run - 5);
          }
          run = 1;
        }
      }
      if (run >= 5) {
        score += 3 + (run - 5);
      }

      const bits = line.map((dark) => (dark ? "1" : "0")).join("");
      for (let start = 0; start + 11 <= size; start += 1) {
        const segment = bits.slice(start, start + 11);
        if (segment === "00001011101" || segment === "10111010000") {
          score += 40;
        }
      }
    }
  }

  // N2: blocos 2x2 iguais
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const color = modules[row][col];
      if (
        color === modules[row][col + 1] &&
        color === modules[row + 1][col] &&
        color === modules[row + 1][col + 1]
      ) {
        score += 3;
      }
    }
  }

  // N4: proporção de módulos escuros
  let dark = 0;
  for (const row of modules) {
    for (const module of row) {
      if (module) {
        dark += 1;
      }
    }
  }
  const percent = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

function buildMatrix(text, level) {
  const bytes = new TextEncoder().encode(text);
  const version = pickVersion(bytes, level);

  const matrix = createMatrix(version);
  placeFunctionPatterns(matrix);

  const codewords = structureFinalMessage(
    encodeDataCodewords(bytes, version, level),
    RS_BLOCKS[version][level],
  );
  placeData(matrix, codewords);

  // Escolhe a máscara com menor penalidade
  let best = null;
  let bestScore = Infinity;

  for (let mask = 0; mask < MASK_FUNCTIONS.length; mask += 1) {
    const candidate = {
      version,
      size: matrix.size,
      modules: matrix.modules.map((row) => row.slice()),
      reserved: matrix.reserved,
    };

    applyMask(candidate, mask);
    placeFormatInformation(candidate, level, mask);

    const score = penaltyScore(candidate);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

/**
 * Converte um texto em um QR Code (PNG base64).
 *
 * @param {string} text Conteúdo codificado no QR Code.
 * @param {object} options { size, margin, dark, light, level }
 * @returns {string} Data URL da imagem PNG gerada.
 */
export function textToQrCodeDataUrl(text, options = {}) {
  const {
    size = 640,
    margin = 4, // zona de silêncio exigida pelo padrão
    dark = "#000000",
    light = "#ffffff",
    level = "M",
  } = options;

  if (!text || typeof text !== "string") {
    throw new Error("Informe um texto para gerar o QR Code.");
  }

  const matrix = buildMatrix(text, level);
  const totalModules = matrix.size + margin * 2;
  const cell = Math.max(1, Math.floor(size / totalModules));
  const pixels = cell * totalModules;

  const canvas = document.createElement("canvas");
  canvas.width = pixels;
  canvas.height = pixels;

  const context = canvas.getContext("2d");
  context.fillStyle = light;
  context.fillRect(0, 0, pixels, pixels);
  context.fillStyle = dark;

  for (let row = 0; row < matrix.size; row += 1) {
    for (let col = 0; col < matrix.size; col += 1) {
      if (matrix.modules[row][col]) {
        context.fillRect(
          (col + margin) * cell,
          (row + margin) * cell,
          cell,
          cell,
        );
      }
    }
  }

  return canvas.toDataURL("image/png");
}
