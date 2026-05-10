import Yoga from 'yoga-layout';

const node = Yoga.Node.create();
node.setWidth(100);
node.setBorder(Yoga.EDGE_ALL, 1);
node.setPadding(Yoga.EDGE_ALL, 1);

const child = Yoga.Node.create();
node.insertChild(child, 0);

node.calculateLayout(200, 200);

console.log('=== Yoga 3.2.1 box model test ===');
console.log('Parent width set to: 100');
console.log('Parent border: 1 on all sides');
console.log('Parent padding: 1 on all sides');
console.log('');
console.log('Parent computed width:', node.getComputedWidth());
console.log('Child computed width:', child.getComputedWidth());
console.log('Child computed left:', child.getComputedLeft());
console.log('');
console.log('If border-box: parent=100, child should be 100-4(border+padding)=96');
console.log('If content-box: parent=104, child should be 100');
