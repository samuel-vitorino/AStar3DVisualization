export function calculatePath(nodes, startNode, endNode){
    let gridHeight = nodes.length;
    let openList = [];
    startNode.g = 0;
    openList.push(startNode);
    while (openList.length > 0){
        //choose best node from the open list
        let currentNode = openList[0];
        for (let i = 0; i < openList.length; i++){
            if (openList[i].f < currentNode.f){
                currentNode = openList[i];
            }
        }
        
        if (currentNode == endNode){
            return true
        }
        
        currentNode.closed = true;
        openList.splice(openList.indexOf(currentNode), 1);

        let x = currentNode.x;
        let y = currentNode.y;

        for (let i = -1; i <= 1; i += 2){
            if (x + i >= 0 && x + i < nodes[y].length && !nodes[y][x+i].closed && !nodes[y][x+i].blocked) {
                let currentHorizontalNode = nodes[y][x+i];
                if (!openList.includes(currentHorizontalNode)){
                    let g = currentNode.g + 1;
                    let h = Math.abs(endNode.x - (x + i)) + Math.abs(endNode.y - y)
                    currentHorizontalNode.g = g;
                    currentHorizontalNode.h = h;
                    currentHorizontalNode.f = g + h;
                    currentHorizontalNode.parent = currentNode;
                    openList.push(currentHorizontalNode);
                }
                else {
                    if (currentHorizontalNode.g > currentNode.g + 1){
                        currentHorizontalNode.parent = currentNode;
                        currentHorizontalNode.g = currentNode.g + 1;
                        currentHorizontalNode.f = currentHorizontalNode.h + currentHorizontalNode.g;
                    }
                }
            }
            if (y + i >= 0  && y + i < gridHeight && !nodes[y+i][x].closed && !nodes[y+i][x].blocked) {
                let currentVerticalNode = nodes[y+i][x];
                if (!openList.includes(currentVerticalNode)){
                    let g = currentNode.g + 1;
                    let h = Math.abs(endNode.x - x) + Math.abs(endNode.y - (y + i))
                    currentVerticalNode.g = g;
                    currentVerticalNode.h = h;
                    currentVerticalNode.f = g + h;
                    currentVerticalNode.parent = currentNode;
                    openList.push(currentVerticalNode);
                }
                else {
                    if (currentVerticalNode.g > currentNode.g + 1){
                        currentVerticalNode.parent = currentNode;
                        currentVerticalNode.g = currentNode.g + 1;
                        currentVerticalNode.f = currentVerticalNode.h + currentVerticalNode.g;
                    }
                }
            }
        }
    }
    return false;
}
