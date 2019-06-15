import { AnimationNode } from "./AnimationNode";
import { Quaternion } from "../math/Quaternion"
import { Vector3 } from "../math/Vector3"
import { Utils3D } from "../utils/Utils3D"
import { Event } from "../../events/Event"
import { EventDispatcher } from "../../events/EventDispatcher"
import { Render } from "../../renders/Render"
import { ConchQuaternion } from "../math/Native/ConchQuaternion"
import { ConchVector3 } from "../math/Native/ConchVector3"
/**
 * <code>AnimationTransform3D</code> 类用于实现3D变换。
 */
export class AnimationTransform3D extends EventDispatcher {
	/**@private */
	private static _tempVector3: Vector3 = new Vector3();
	/**@private */
	private static _angleToRandin: number = 180 / Math.PI;

	/** @private */
	private _localMatrix: Float32Array;
	/** @private */
	private _worldMatrix: Float32Array;
	/** @private */
	private _localPosition: Vector3;
	/** @private */
	private _localRotation: Quaternion;
	/** @private */
	private _localScale: Vector3;
	/** @private */
	private _localQuaternionUpdate: boolean;
	/** @private */
	private _locaEulerlUpdate: boolean;
	/** @private */
	private _localUpdate: boolean;
	/** @private */
	private _parent: AnimationTransform3D;
	/** @private */
	private _children: AnimationTransform3D[];

	/**@private */
	_localRotationEuler: Vector3;
	/**@private */
	_owner: AnimationNode;
	/** @private */
	_worldUpdate: boolean;

	/**
	 * 创建一个 <code>Transform3D</code> 实例。
	 * @param owner 所属精灵。
	 */
	constructor(owner: AnimationNode, localPosition: Float32Array = null/*[NATIVE]*/, localRotation: Float32Array = null/*[NATIVE]*/, localScale: Float32Array = null/*[NATIVE]*/, worldMatrix: Float32Array = null/*[NATIVE]*/) {
		super();
		this._owner = owner;
		this._children = [];

		this._localMatrix = new Float32Array(16);
		if (Render.supportWebGLPlusAnimation) {
			/*
			_localPosition = new Vector3(0,0,0);
			_localPosition.forNativeElement(localPosition);
			_localRotation = new Quaternion(0,0,0,1);
			_localRotation.forNativeElement(localRotation);
			_localScale = new Vector3(0,0,0);
			_localScale.forNativeElement(localScale);
			_worldMatrix = worldMatrix;
			*/

			this._localPosition = new ConchVector3(0,0,0,localPosition) as any as Vector3;
			this._localRotation = new ConchQuaternion(0,0,0,1,localRotation) as any as Quaternion;
			this._localScale = new ConchVector3(0,0,0,localScale) as any as Vector3;
			this._worldMatrix = worldMatrix;
		} else {
			this._localPosition = new Vector3();
			this._localRotation = new Quaternion();
			this._localScale = new Vector3();
			this._worldMatrix = new Float32Array(16);
		}
		this._localQuaternionUpdate = false;
		this._locaEulerlUpdate = false;
		this._localUpdate = false;
		this._worldUpdate = true;
	}

	/**
	 * @private
	 */
	private _getlocalMatrix(): Float32Array {
		if (this._localUpdate) {
			Utils3D._createAffineTransformationArray(this._localPosition, this._localRotation, this._localScale, this._localMatrix);
			this._localUpdate = false;
		}
		return this._localMatrix;
	}

	/**
	 * @private
	 */
	private _onWorldTransform(): void {
		if (!this._worldUpdate) {
			this._worldUpdate = true;
			this.event(Event.TRANSFORM_CHANGED);
			for (var i: number = 0, n: number = this._children.length; i < n; i++)
				this._children[i]._onWorldTransform();
		}
	}

	/**
	 * @private
	 */
	get localPosition(): Vector3 {
		return this._localPosition;
	}

	/**
	 * @private
	 */
	set localPosition(value: Vector3) {
		this._localPosition = value;
		this._localUpdate = true;
		this._onWorldTransform();
	}

	/**
	 * @private
	 */
	get localRotation(): Quaternion {
		if (this._localQuaternionUpdate) {
			var euler: Vector3 = this._localRotationEuler;
			Quaternion.createFromYawPitchRoll(euler.y / AnimationTransform3D._angleToRandin, euler.x / AnimationTransform3D._angleToRandin, euler.z / AnimationTransform3D._angleToRandin, this._localRotation);
			this._localQuaternionUpdate = false;
		}
		return this._localRotation;
	}

	/*
	 * @private
	 */
	set localRotation(value: Quaternion) {
		this._localRotation = value;
		//Utils3D.quaterionNormalize(_localRotation, _localRotation);
		this._locaEulerlUpdate = true;
		this._localQuaternionUpdate = false;
		this._localUpdate = true;
		this._onWorldTransform();
	}

	/**
	 * @private
	 */
	get localScale(): Vector3 {
		return this._localScale;
	}

	/**
	 * @private
	 */
	set localScale(value: Vector3) {
		this._localScale = value;
		this._localUpdate = true;
		this._onWorldTransform();
	}

	/**
	 * @private
	 */
	get localRotationEuler(): Vector3 {
		if (this._locaEulerlUpdate) {
			this._localRotation.getYawPitchRoll(AnimationTransform3D._tempVector3);
			var euler: Vector3 = AnimationTransform3D._tempVector3;
			var localRotationEuler: Vector3 = this._localRotationEuler;
			localRotationEuler.x = euler.y * AnimationTransform3D._angleToRandin;
			localRotationEuler.y = euler.x * AnimationTransform3D._angleToRandin;
			localRotationEuler.z = euler.z * AnimationTransform3D._angleToRandin;
			this._locaEulerlUpdate = false;
		}
		return this._localRotationEuler;
	}

	/**
	 * @private
	 */
	set localRotationEuler(value: Vector3) {
		this._localRotationEuler = value;
		this._locaEulerlUpdate = false;
		this._localQuaternionUpdate = true;
		this._localUpdate = true;
		this._onWorldTransform();
	}

	/**
	 * 获取世界矩阵。
	 * @return	世界矩阵。
	 */
	getWorldMatrix(): Float32Array {
		if (!Render.supportWebGLPlusAnimation && this._worldUpdate) {
			if (this._parent != null) {
				Utils3D.matrix4x4MultiplyFFF(this._parent.getWorldMatrix(), this._getlocalMatrix(), this._worldMatrix);
			} else {
				var e: Float32Array = this._worldMatrix;//根节点的世界矩阵始终为单位矩阵。需使用Animator中的矩阵,否则移动Animator精灵无效
				e[1] = e[2] = e[3] = e[4] = e[6] = e[7] = e[8] = e[9] = e[11] = e[12] = e[13] = e[14] = 0;
				e[0] = e[5] = e[10] = e[15] = 1;
			}
			this._worldUpdate = false;
		}
		if (Render.supportWebGLPlusAnimation && this._worldUpdate) {
			this._worldUpdate = false;
		}
		return this._worldMatrix;
	}

	/**
	 * 设置父3D变换。
	 * @param	value 父3D变换。
	 */
	setParent(value: AnimationTransform3D): void {
		if (this._parent !== value) {
			if (this._parent) {
				var parentChilds: AnimationTransform3D[] = this._parent._children;
				var index: number = parentChilds.indexOf(this);
				parentChilds.splice(index, 1);
			}
			if (value) {
				value._children.push(this);
				(value) && (this._onWorldTransform());
			}
			this._parent = value;
		}
	}
}

