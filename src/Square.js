export default class Square{
    mesh = undefined;
    parent = undefined;
    closed = false;
    blocked = false;
    g;
    h;
    f;
    
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
}
