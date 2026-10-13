// create-box-faces.js
import { add, localToWorld, project } from "./layer-decompose-prompt.jsx";
export function createBoxFaces({
  key,
  center,
  size,
  basis,
  fills,
  stroke,
}) {
  const x2 = size.x / 2;
  const y4 = size.y / 2;
  const z3 = size.z / 2;
  const vertices = [
    {
      x: -x2,
      y: -y4,
      z: -z3,
    },
    {
      x: x2,
      y: -y4,
      z: -z3,
    },
    {
      x: x2,
      y: y4,
      z: -z3,
    },
    {
      x: -x2,
      y: y4,
      z: -z3,
    },
    {
      x: -x2,
      y: -y4,
      z: z3,
    },
    {
      x: x2,
      y: -y4,
      z: z3,
    },
    {
      x: x2,
      y: y4,
      z: z3,
    },
    {
      x: -x2,
      y: y4,
      z: z3,
    },
  ].map((point) => add(point, center));
  const definitions = [
    {
      name: "back",
      indices: [0, 3, 2, 1],
      normal: {
        x: 0,
        y: 0,
        z: -1,
      },
    },
    {
      name: "front",
      indices: [4, 5, 6, 7],
      normal: {
        x: 0,
        y: 0,
        z: 1,
      },
    },
    {
      name: "left",
      indices: [0, 4, 7, 3],
      normal: {
        x: -1,
        y: 0,
        z: 0,
      },
    },
    {
      name: "right",
      indices: [1, 2, 6, 5],
      normal: {
        x: 1,
        y: 0,
        z: 0,
      },
    },
    {
      name: "bottom",
      indices: [0, 1, 5, 4],
      normal: {
        x: 0,
        y: -1,
        z: 0,
      },
    },
    {
      name: "top",
      indices: [3, 7, 6, 2],
      normal: {
        x: 0,
        y: 1,
        z: 0,
      },
    },
  ];
  return definitions.flatMap((definition) => {
    const visibility = localToWorld(definition.normal, basis).z;
    if (visibility <= 1e-3) return [];
    const points = definition.indices.map((index) =>
      project(vertices[index], basis),
    );
    return [
      {
        key: `${key}-${definition.name}`,
        points,
        depth:
          points.reduce((sum, point) => sum + point.z, 0) / points.length,
        fill: fills[definition.name] ?? fills.front,
        stroke,
      },
    ];
  });
}
