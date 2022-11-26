/* eslint-disable no-multi-assign */
/* eslint-disable no-unreachable */
import * as T from 'three';
import dat from 'dat.gui';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// import fragment from './shader/fragment.glsl';
// import vertex from '../../shader/vertex.glsl';

import gsap from 'gsap';
import image from './image.webp';

export default class Sketch {
	constructor(options) {
		this.scene = new T.Scene();

		this.container = options.dom;
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer = new T.WebGLRenderer();
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.width, this.height);
		this.renderer.setClearColor(0xeeeeee, 1);
		this.renderer.physicallyCorrectLights = true;
		this.renderer.outputEncoding = T.sRGBEncoding;

		this.container.appendChild(this.renderer.domElement);

		this.camera = new T.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.001,
			1000,
		);

		const frustumSize = 1;
		// const aspect = window.innerWidth / (window.innerHeight * 1.5);
		this.camera = new T.OrthographicCamera(frustumSize / -2, frustumSize / 2, frustumSize / 2, frustumSize / -2, -1000, 1000);
		this.camera.position.set(0, 0, 2);
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.time = 0;

		this.isPlaying = true;

		this.mouse = {
			x: 0,
			y: 0,
			prevX: 0,
			prevY: 0,
			vX: 0,
			vY: 0,
		};

		this.loadObjects().then(() => {
			this.addObjects();
			this.resize();
			this.render();
			this.setupResize();
			this.mouseEvents();
		});
	}

	settings() {
		let that = this;
		this.settings = {
			progress: 0,
		};
		this.gui = new dat.GUI();
		this.gui.add(this.settings, 'progress', 0, 1, 0.01);
	}

	setupResize() {
		window.addEventListener('resize', this.resize.bind(this));
	}

	resize() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.renderer.setSize(this.width, this.height);
		this.camera.aspect = this.width / this.height;

		this.imageAspect = 1 / 1.5;
		let a1;
		let a2;

		if (this.height / this.width > this.imageAspect) {
			a1 = (this.width / this.height) * this.imageAspect;
			a2 = 1;
		} else {
			a1 = 1;
			a2 = (this.height / this.width) / this.imageAspect;
		}

		this.material.uniforms.resolution.value.x = this.width;
		this.material.uniforms.resolution.value.y = this.height;
		this.material.uniforms.resolution.value.z = a1;
		this.material.uniforms.resolution.value.w = a2;

		this.camera.updateProjectionMatrix();
	}

	loadObjects() {
		const loader = new T.FileLoader();

		const fragment = new Promise((resolve, reject) => {
			loader.load(
				'./shader/fragment.glsl',
				(data) => {
					this.fragment = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		const vertex = new Promise((resolve, reject) => {
			loader.load(
				'./shader/vertex.glsl',
				(data) => {
					this.vertex = data;
					resolve();
				},
				() => {},
				(err) => {
					console.log(err);
					reject();
				},
			);
		});

		return Promise.all([fragment, vertex]);
	}

	addObjects() {
		this.size = 54; // Чем больше значение, тем меньше ячейка
		const width = this.size;
		const height = this.size;

		const size = width * height;

		// --------------------------------------------- Определяем количество ячеек в сетке
		const data = new Uint8Array((size * 4)); // size*size*4
		// --------------------------------------------- Определяем количество ячеек в сетке###

		// --------------------------------------------- Определям начальную позицию ячеек сетки дата-текстуры
		for (let i = 0; i < size; i += 1) {
			const r = Math.round(Math.random() * 255);

			const stride = i * 4; // 4 - множитель из формулы сетки size*size*4

			data[stride] = r;
			data[stride + 1] = r;
			data[stride + 2] = r;
			data[stride + 3] = 0;
		}
		// --------------------------------------------- Определям начальную позицию ячеек сетки дата-текстуры###

		// --------------------------------------------- Создаем дата-текстуру, которая наложится на нашу картинку
		this.texture = new T.DataTexture(data, width, height, T.RGBAFormat);
		this.texture.magFilter = T.NearestFilter;
		this.texture.minFilter = T.NearestFilter;
		// --------------------------------------------- Создаем дата-текстуру, которая наложится на нашу картинку###

		this.material = new T.ShaderMaterial({
			extensions: {
				derivatives: '#extension GL_OES_standard_derivatives : enable',
			},
			side: T.DoubleSide,
			uniforms: { // передаем данные в дата-текстуру (fragment.glsl)
				time: { value: 0 },
				resolution: {
					value: new T.Vector4(),
				},
				uTexture: {
					value: new T.TextureLoader().load(image),
				},
				uDataTexture: {
					value: this.texture,
				},
			},
			// wireframe: true,
			// transparent: true,
			vertexShader: this.vertex,
			fragmentShader: this.fragment,
		});

		this.geometry = new T.PlaneGeometry(1, 1, 1, 1);

		this.plane = new T.Mesh(this.geometry, this.material);
		this.scene.add(this.plane);
	}

	stop() {
		this.isPlaying = false;
	}

	play() {
		if (!this.isPlaying) {
			this.render();
			this.isPlaying = true;
		}
	}

	mouseEvents() {
		window.addEventListener('mousemove', (e) => {
			// --------------------------------------------- Получаем позицию курсора
			this.mouse.x = e.clientX / this.width;
			this.mouse.y = e.clientY / this.height;

			this.mouse.vX = this.mouse.x - this.mouse.prevX;
			this.mouse.vY = this.mouse.y - this.mouse.prevY;

			this.mouse.prevX = this.mouse.x;
			this.mouse.prevY = this.mouse.y;
			// --------------------------------------------- Получаем позицию курсора###
		});
	}

	updateDataTexture() {
		const { data } = this.texture.image;
		this.normalizeEasing = 0.98;
		this.gridMouseX = this.size * this.mouse.x; // позиция мыши на сетке координат
		this.gridMouseY = this.size * (1 - this.mouse.y); // позиция мыши на сетке координат
		this.maxDistRange = this.size / 4; // коеф. радиуса захвата дисторшена

		// --------------------------------------------- На каждом рендере плавно возвращаем ячейку в исходную позицию
		for (let i = 0; i < data.length; i += 4) {
			data[i] *= this.normalizeEasing;
			data[i + 1] *= this.normalizeEasing;
		}
		// --------------------------------------------- На каждом рендере плавно возвращаем ячейку в исходную позицию###

		for (let i = 0; i < this.size; i += 1) {
			for (let j = 0; j < this.size; j += 1) { // "i" и "j" являются координатами сетки sizexsize
				this.distance = (this.gridMouseX - i) ** 2 + (this.gridMouseY - j) ** 2;
				this.maxDistRangeSq = this.maxDistRange ** 2;

				if (this.distance < this.maxDistRangeSq) {
					this.currentCellIndex = ((this.size * j) + i) * 4; // 4 - множитель из формулы сетки size*size*4
					this.power = (Math.sqrt(this.distance) / this.maxDistRange) * 1000;

					if (this.distance !== 0) {
						this.power = (Math.sqrt(this.distance) / this.maxDistRange) * 1000;
					} else {
						this.power = 1;
					}

					data[this.currentCellIndex] += this.mouse.vX * (this.mouse.vX < 0 ? this.power : -this.power); // задаем смещение ячейке, зависящее от скорости мыши
					data[this.currentCellIndex + 1] -= this.mouse.vY * (this.mouse.vY < 0 ? -this.power : this.power); // задаем смещение ячейке, зависящее от скорости мыши
				}
			}
		}

		this.mouse.vX *= 0.5;
		this.mouse.vY *= 0.5;

		this.texture.needsUpdate = true; // обновляем дата-текстуру с новыми значениями
	}

	render() {
		if (!this.isPlaying) return;
		this.time += 0.05;
		this.updateDataTexture();
		this.material.uniforms.time.value = this.time;
		window.requestAnimationFrame(this.render.bind(this));
		this.renderer.render(this.scene, this.camera);
	}
}
