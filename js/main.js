
function rotateBowCenter(angle) {
    let { min, max } = Composite.bounds(bow);
    let dx = (-min.x + max.x) * 0.5;
    let dy = (-min.y + max.y) * 0.5;
    let center = {
        x: + min.x + dx,
        y: + min.y + dy
    };
    Composite.setAngle(bow, angle, center);
}

function bowAngle() {
    return Composite.allBodies(bow)[3].angle;
}

function bowNormal() {
    let a = bowAngle();
    return { x: Math.cos(a), y: Math.sin(a) };
}

function bowDragNormal() {
    let { x, y } = bowNormal();
    return { x: -x, y: -y };
}

function vecFromDragToEnd() {
    let dx = -bow_hi_rope_rig.position.x + bow_lo_rope_rig.position.x;
    let dy = -bow_hi_rope_rig.position.y + bow_lo_rope_rig.position.y;

    dx /= 2;
    dy /= 2;
    let out_vec = bowNormal();

    out_vec.x *= 200;
    out_vec.y *= 200;

    let hirope = Matter.Vector.clone(bow_hi_rope_rig.position);

    out_vec.x = hirope.x + dx + out_vec.x;
    out_vec.y = hirope.y + dy + out_vec.y;

    return { x: -rope_pull_body.position.x + out_vec.x, y: -rope_pull_body.position.y + out_vec.y };
}

function mouseBowAngle() {
    let dx = -W / 2 + mouse.position.x;
    let dy = -H / 2 + mouse.position.y;
    let a = Math.atan2(dy, dx);
    if (a < 0) {
        a = -a;
    } else {
        a = Math.PI * 2 - a;
    }
    return a;
}


ENGINE_LOAD_ARROW = false;
ENGINE_ARROW_LOADED = true;
ENGINE_LOAD_ARROR_F = () => { };

function releaseBow(timeout = 1000) {

    let oldpos = Matter.Vector.clone(arrow.position);
    Body.setStatic(arrow, false);
    arrow._IS_RELEASED = true;
    //old arrow is now "deleted";
    //mask: A bit mask that specifies the collision categories this body may collide with
    //category: A bit field that specifies the collision category this body belongs to. The category value should have only one bit set, for example 0x0001.
    //group: An Integer Number, that specifies the collision group this body belongs to.
    //CTRL + F -> collides_group;
    arrow2 = Bodies.rectangle(oldpos.x, oldpos.y, arrow_len, 5, { collisionFilter: { group: collides_group, category: 2, mask: 2 }, isStatic: false });
    if (ENGINE_ARROW_LOADED) {
        World.add(world, arrow2);
    }

    let arrow_angle = Matter.Vector.angle(vecFromDragToEnd(), { x: 1, y: 0 });
    let bow_normal = bowNormal();
    Body.setAngle(arrow2, arrow_angle);

    Body.setPosition(arrow2, {
        x: rope_pull_body.position.x + bow_normal.x * arrow_len * 0.5,
        y: rope_pull_body.position.y + bow_normal.y * arrow_len * 0.5
    });



    const release_power = 0.05;
    let prev_pow = POWER_0_1;
    POWER_0_1 = 0;
    let norm = bowNormal();
    norm.x *= release_power * prev_pow;
    norm.y *= release_power * prev_pow;
    console.log(norm);
    Body.applyForce(rope_pull_body, rope_pull_body.position, norm);
    Body.applyForce(arrow2, arrow2.position, { x: norm.x * 5, y: norm.y * 5 });

    if (ENGINE_ARROW_LOADED) {
        ENGINE_ARROW_LOADED = false;
        setTimeout(() => {
            //create new arrow !
            ENGINE_LOAD_ARROW = true;
            ENGINE_LOAD_ARROR_F = () => {
                ENGINE_ARROW_LOADED = true;
                ENGINE_LOAD_ARROW = false;
                arrow = Bodies.rectangle(oldpos.x, oldpos.y, arrow_len, 5, { collisionFilter: { group }, isStatic: true });
                World.add(world, arrow);
                if (Number.isNaN(arrow2.angle)) {
                    console.error(":(");
                    console.log("sad", arrow.position);
                    World.remove(world, arrow2)
                    releaseBow(1000);
                }
            };
        }, timeout);
    }
}

function main() {
    console.log('it has begun');
    Engine = Matter.Engine;
    Render = Matter.Render;
    Runner = Matter.Runner;
    Body = Matter.Body;
    Composite = Matter.Composite;

    Composite.setAngle = function (composite, rotation, point, recursive, FIX_FLAG = true) {
        let cos = Math.cos(rotation),
            sin = Math.sin(rotation),
            bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        let ignore_back = false;
        if (FIX_FLAG) {
            if (composite._COMPOSITE_SET_ANGLE_MEM_ === undefined) {
                ignore_back = true;
            }

            if (!ignore_back) {
                Composite.setAngle(composite, -composite._COMPOSITE_SET_ANGLE_MEM_, point, recursive, false);
            }
            composite._COMPOSITE_SET_ANGLE_MEM_ = rotation;
        }
        for (let i = 0; i < bodies.length; i++) {
            let body = bodies[i],
                dx = body.position.x - point.x,
                dy = body.position.y - point.y;



            Body.setPosition(body, {
                x: point.x + (dx * cos - dy * sin),
                y: point.y + (dx * sin + dy * cos)
            });

            Body.rotate(body, rotation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };

    Composite.setTranslate = function (composite, translation, recursive, FIX_FLAG = true) {
        var bodies = recursive ? Composite.allBodies(composite) : composite.bodies;

        let ignore_back = false;
        if (FIX_FLAG) {
            if (composite._COMPOSITE_SET_TRANSLATE_MEM_ === undefined) {
                ignore_back = true;
            }

            if (!ignore_back) {
                let pt = {
                    x: -composite._COMPOSITE_SET_TRANSLATE_MEM_.x,
                    y: -composite._COMPOSITE_SET_TRANSLATE_MEM_.y
                };
                Composite.setTranslate(composite, pt, recursive, false);
            }
            composite._COMPOSITE_SET_TRANSLATE_MEM_ = translation;
        }

        for (var i = 0; i < bodies.length; i++) {
            Body.translate(bodies[i], translation);
        }

        Composite.setModified(composite, true, true, false);

        return composite;
    };


    Composite.bounds = function (composite) {
        let bodies = Matter.Composite.allBodies(composite),
            vertices = [];

        for (let i = 0; i < bodies.length; i += 1) {
            var body = bodies[i];
            vertices.push(body.bounds.min, body.bounds.max);
        }

        return Matter.Bounds.create(vertices);
    };
    Composites = Matter.Composites;
    Constraint = Matter.Constraint;
    MouseConstraint = Matter.MouseConstraint;
    Mouse = Matter.Mouse;
    World = Matter.World;
    Bodies = Matter.Bodies;

    // create engine
    engine = Engine.create();
    world = engine.world;

    // create renderer
    render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: 800,
            height: 600,
            showAngleIndicator: true,
            showCollisions: true,
            showVelocity: true
        }
    });

    // add bodies
    group = Body.nextGroup(true);
    collides_group = Body.nextGroup(false);

    let bow_part_len = 100;
    bow_lo = Bodies.rectangle(100, 150, bow_part_len, 20, { collisionFilter: { group }, isStatic: true });
    bow_hi = Bodies.rectangle(100, 50, bow_part_len, 20, { collisionFilter: { group }, isStatic: true });

    bow_hi_rope_rig = Bodies.rectangle(100 - 25, 10, 20, 20, { collisionFilter: { group }, isStatic: true });
    bow_lo_rope_rig = Bodies.rectangle(100 - 25, 198.301 - 10, 20, 20, { collisionFilter: { group }, isStatic: true });

    arrow_len = 250;
    arrow = Bodies.rectangle(200, 200, arrow_len, 5, { collisionFilter: { group }, isStatic: true });
    World.add(world, arrow);

    DEBUX_BOX = Bodies.rectangle(200, 200, 50, 50, { collisionFilter: { group }, isStatic: true });
    World.add(world, DEBUX_BOX);


    let bow_rope = [];
    let bow_rope_cons = [];
    let bow_rope_part_len = 5;
    let bow_rope_segs = 30;
    for (let i = 0; i < bow_rope_segs; i++) {
        let body = Bodies.rectangle(300, i * bow_rope_part_len, 5, bow_rope_part_len, { collisionFilter: { group } });
        bow_rope.push(body);
        if (i == bow_rope_segs - 1)
            bow_rope.pop();

        let option = { bodyA: i == 0 ? bow_hi_rope_rig : bow_rope[i - 1], bodyB: i == bow_rope_segs - 1 ? bow_lo_rope_rig : bow_rope[i], length: 1, stiffness: 1 };
        bow_rope_cons.push(
            Constraint.create(option)
        );
    }
    World.add(world, bow_rope);
    World.add(world, bow_rope_cons);
    Body.setAngle(bow_lo, -Math.PI / 180 * 60);
    Body.setAngle(bow_hi, +Math.PI / 180 * 60);

    rope_pull_body = bow_rope[Math.floor(bow_rope.length / 2)];

    bow = Composite.create({ bodies: [bow_lo, bow_hi, bow_lo_rope_rig, bow_hi_rope_rig] });

    World.add(world, [
        bow,
        rec = Bodies.rectangle(400, 600, 1200, 50.5, { isStatic: true, collisionFilter: { group: collides_group, category: 2, mask: 2 } })
    ]);

    // add mouse control
    mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });

    World.add(world, mouseConstraint);

    let canvas = render.canvas;
    W = canvas.width;
    H = canvas.height;
    let bow_bounds = Composite.bounds(bow);
    bow_center = { x: W / 2 - bow_bounds.max.x * 0.5, y: H / 2 - bow_bounds.max.y * 0.5 };
    POWER_0_1 = 0;
    let fps = 1000 / 60;
    setInterval(() => {
        if (ENGINE_LOAD_ARROW) {
            ENGINE_LOAD_ARROR_F();
        }

        Composite.setTranslate(bow, bow_center);
        rotateBowCenter(-mouseBowAngle());

        switch (mouse.button) {
            case 0:
                POWER_0_1 += 0.005;
                if (POWER_0_1 > 1)
                    POWER_0_1 = 1;
                break;
            case -1:
                if (POWER_0_1 > 0) {
                    releaseBow();
                }
                break;

        }
        if (POWER_0_1 != 0) {
            let drag_normal = bowDragNormal();
            const drag_power = 50;
            Body.setVelocity(rope_pull_body, { x: drag_normal.x * POWER_0_1 * drag_power, y: drag_normal.y * POWER_0_1 * drag_power });
        }
        let bow_normal = bowNormal();

        let v = vecFromDragToEnd();
        let new_pos_out_bow = { x: rope_pull_body.position.x + v.x, y: rope_pull_body.position.y + v.y };
        Body.setPosition(DEBUX_BOX, { x: -100, y: -100 });//new_pos_out_bow);

        if (!arrow._IS_RELEASED) {
            let arrow_angle = Matter.Vector.angle(vecFromDragToEnd(), { x: 1, y: 0 });
            Body.setAngle(arrow, arrow_angle);
            //console.log(arrow_angle * 180 / Math.PI);
            bow_normal = Matter.Vector.normalise(vecFromDragToEnd());
            Body.setPosition(arrow, {
                x: rope_pull_body.position.x + bow_normal.x * arrow_len * 0.5,
                y: rope_pull_body.position.y + bow_normal.y * arrow_len * 0.5
            });
        }
        Engine.update(engine, fps, 1);
        Render.world(render)
    }, fps);

}