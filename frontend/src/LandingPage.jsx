import { useEffect, useRef, useState } from 'react'
import './LandingPage.css'

export default function LandingPage({ onEnterApp }) {
  const loaderRef = useRef(null)
  const navRef = useRef(null)
  const scrollProgressRef = useRef(null)
  const backToTopRef = useRef(null)
  const particlesRef = useRef(null)
  const [loaderHidden, setLoaderHidden] = useState(false)
  const [navScrolled, setNavScrolled] = useState(false)
  const [backTopVisible, setBackTopVisible] = useState(false)
  const [timecode, setTimecode] = useState('')
  const revealRefs = useRef([])

  useEffect(() => {
    // Hide loader after animation
    const timer = setTimeout(() => setLoaderHidden(true), 1800)
    return () => clearTimeout(timer)
  }, [])

  // Scroll & intersection observer effects
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY
      // Nav background
      setNavScrolled(scrolled > 50)
      // Scroll progress bar
      if (scrollProgressRef.current) {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        scrollProgressRef.current.style.width = `${(scrolled / docHeight) * 100}%`
      }
      // Back to top
      setBackTopVisible(scrolled > 500)
      // Parallax orbs
      document.querySelectorAll('.lp-hero-orb').forEach((orb, i) => {
        const speed = 0.2 + i * 0.1
        orb.style.transform = `translateY(${scrolled * speed}px)`
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Intersection Observer for reveal animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    revealRefs.current.forEach((el) => { if (el) observer.observe(el) })

    // Timecode counter
    let rafId
    function updateTimecode() {
      const now = new Date()
      const tc =
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0') + ':' +
        String(now.getSeconds()).padStart(2, '0') + ':' +
        String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')
      setTimecode(tc)
      rafId = requestAnimationFrame(updateTimecode)
    }
    updateTimecode()

    // Footer particles
    if (particlesRef.current) {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div')
        particle.className = 'particle'
        particle.style.cssText = `
          position:absolute;width:4px;height:4px;background:rgba(37,99,235,0.3);
          border-radius:50%;left:${Math.random() * 100}%;top:${Math.random() * 100}%;
          animation:lp-orb-float ${4 + Math.random() * 4}s ease-in-out infinite;
          animation-delay:${Math.random() * 6}s;
        `
        particlesRef.current.appendChild(particle)
      }
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      observer.disconnect()
      cancelAnimationFrame(rafId)
    }
  }, [])

  // Smooth scroll to section
  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const addRevealRef = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el)
    }
  }

  return (
    <div className="landing-page">
      {/* Film Grain */}
      <div className="lp-film-grain" />

      {/* Loading Screen */}
      <div ref={loaderRef} className={`lp-loader${loaderHidden ? ' hidden' : ''}`}>
        <div className="lp-loader-clapboard">
          <div className="lp-loader-clapboard-top" />
          <div className="lp-loader-clapboard-body"><span>SCENE 1</span></div>
        </div>
        <div className="lp-loader-text">
          <span>剧</span><span>本</span><span>人</span><span>&nbsp;</span><span>A</span><span>I</span>
        </div>
        <div className="lp-loader-bar"><div className="lp-loader-bar-inner" /></div>
      </div>

      {/* Scroll Progress */}
      <div ref={scrollProgressRef} className="lp-scroll-progress" />

      {/* Navigation */}
      <nav ref={navRef} className={`lp-nav${navScrolled ? ' scrolled' : ''}`}>
        <a href="#" className="lp-logo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <span className="lp-logo-icon" />剧本人 AI
        </a>
        <ul className="lp-nav-links">
          <li><a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>产品功能</a></li>
          <li><a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works') }}>使用教程</a></li>
          <li><a href="#about" onClick={(e) => { e.preventDefault(); scrollTo('about') }}>关于我们</a></li>
        </ul>
        <button className="lp-nav-cta" onClick={onEnterApp}>立即体验</button>
      </nav>

      {/* Hero Section */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero-bg">
          <div className="lp-hero-orb" />
          <div className="lp-hero-orb" />
          <div className="lp-hero-orb" />
        </div>
        <div className="lp-hero-corner-deco tl">CAM-A</div>
        <div className="lp-hero-corner-deco tr">24FPS</div>
        <div className="lp-hero-corner-deco bl">ISO 800</div>
        <div className="lp-hero-corner-deco br">TAKE 1</div>

        <div className="lp-badge">
          <span className="lp-badge-dot" /> AI 驱动的剧本创作引擎
        </div>
        <h1>让每一部小说，都值得被拍成网剧</h1>
        <p className="lp-hero-subtitle">
          上传你的小说，AI 自动拆解情节、重构叙事节奏、生成专业网剧分镜剧本。从文学到画面，只需几分钟。
        </p>
        <div className="lp-hero-ctas">
          <button className="lp-btn-primary" onClick={onEnterApp}>
            立即体验
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <button className="lp-btn-secondary" onClick={() => scrollTo('features')}>了解更多</button>
        </div>
        <p className="lp-hero-trust">
          已为众多小说创作者生成专业剧本
        </p>

        <div className="lp-hero-visual">
          <div className="lp-viewfinder" />
          <div className="lp-vf-corner tl" /><div className="lp-vf-corner tr" />
          <div className="lp-vf-corner bl" /><div className="lp-vf-corner br" />
          <div style={{ position:'relative',zIndex:1,width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',boxSizing:'border-box' }}>
            <img src="/assets/overview.png" alt="产品界面预览"
              style={{ maxWidth:'100%',maxHeight:'100%',width:'auto',height:'auto',objectFit:'contain',display:'block',borderRadius:'8px',boxShadow:'0 12px 40px rgba(0,0,0,0.12)' }} />
          </div>
        </div>

        <div className="lp-scroll-indicator">
          <span>Scroll</span>
          <div className="lp-scroll-mouse" />
        </div>
      </section>

      {/* Filmstrip Divider */}
      <div className="lp-filmstrip-divider">
        <div className="lp-filmstrip-text">
          SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp; SCENE 01 &nbsp;
        </div>
      </div>

      {/* How It Works */}
      <section className="lp-how-it-works" id="how-it-works">
        <div className="lp-container">
          <div className="lp-section-header" ref={addRevealRef}>
            <span className="lp-scene-tag">Scene 02 &mdash; Action</span>
            <h2>三步开启剧本创作</h2>
            <p>无需编剧经验，AI 全程辅助，让小说到剧本的转化变得简单高效</p>
          </div>
          <div className="lp-steps-grid">
            <div className={`lp-step-card lp-reveal`} ref={addRevealRef}>
              <div className="lp-step-num">01</div>
              <h3>上传小说</h3>
              <p>支持 txt 格式，自动识别中文章回体、数字章节，AI 秒级理解核对人物与事件</p>
              <div className="lp-step-take">Take 1 &mdash; Upload</div>
            </div>
            <div className={`lp-step-card lp-reveal lp-stagger-1`} ref={addRevealRef}>
              <div className="lp-step-num">02</div>
              <h3>智能拆解</h3>
              <p>五阶段 Pipeline 自动运行：事件提取、改编分析、分集规划、剧本写作、审核校验</p>
              <div className="lp-step-take">Take 2 &mdash; Analyze</div>
            </div>
            <div className={`lp-step-card lp-reveal lp-stagger-2`} ref={addRevealRef}>
              <div className="lp-step-num">03</div>
              <h3>导出剧本</h3>
              <p>YAML 标准剧本一键导出，含场景、对白、情绪标记，直接对接拍摄工作流</p>
              <div className="lp-step-take">Take 3 &mdash; Export</div>
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider */}
      <div className="lp-gradient-divider" />

      {/* Core Features */}
      <section className="lp-core-features" id="features">
        <div className="lp-container">
          <div className="lp-section-header" ref={addRevealRef}>
            <span className="lp-scene-tag">Scene 03 &mdash; Features</span>
            <h2>为专业剧本创作而生</h2>
            <p>五大核心能力，覆盖从小说解析到剧本定稿的完整工作流</p>
          </div>

          <div className={`lp-feature-block lp-reveal`} ref={addRevealRef}>
            <div className="lp-feature-text">
              <span className="lp-feature-label">事件核对引擎</span>
              <h3>AI 理解核对，结构化拆解每章叙事</h3>
              <p>自动提取人物、地点、事件、时间线，构建完整的事件图谱，确保剧本与原著在逻辑层面完全一致。</p>
              <div className="lp-feature-scene-tag">Feature A &mdash; Extraction</div>
            </div>
            <div className="lp-feature-img">
              <img src="/assets/event-check.png" alt="AI 事件核对"
                style={{ maxHeight:'320px',width:'auto',display:'block',margin:'0 auto',borderRadius:'4px',position:'relative',zIndex:3,boxShadow:'0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.08),0 24px 64px rgba(37,99,235,0.06)' }} />
            </div>
          </div>

          <div className={`lp-feature-block lp-reveal lp-stagger-1 lp-feature-reverse`} ref={addRevealRef}>
            <div className="lp-feature-text">
              <span className="lp-feature-label">改编分析引擎</span>
              <h3>多维度评估，科学指导改编决策</h3>
              <p>从叙事节奏、人物弧光、冲突密度、情感曲线等多维度分析小说，为每一章生成可操作的改编建议。</p>
              <div className="lp-feature-scene-tag">Feature B &mdash; Analysis</div>
            </div>
            <div className="lp-feature-img">
              <img src="/assets/adaptation.png" alt="改编分析界面"
                style={{ maxHeight:'320px',width:'auto',display:'block',margin:'0 auto',borderRadius:'4px',position:'relative',zIndex:3,boxShadow:'0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.08),0 24px 64px rgba(37,99,235,0.06)' }} />
            </div>
          </div>

          <div className={`lp-feature-block lp-reveal lp-stagger-2`} ref={addRevealRef}>
            <div className="lp-feature-text">
              <span className="lp-feature-label">分集规划引擎</span>
              <h3>智能分集，让节奏恰到好处</h3>
              <p>基于三幕结构和情绪曲线算法，自动规划集数分配、每集钩子、爽点布局，确保观众持续追剧。</p>
              <div className="lp-feature-scene-tag">Feature C &mdash; Planning</div>
            </div>
            <div className="lp-feature-img">
              <img src="/assets/episode-plan.png" alt="分集规划"
                style={{ maxHeight:'320px',width:'auto',display:'block',margin:'0 auto',borderRadius:'4px',position:'relative',zIndex:3,boxShadow:'0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.08),0 24px 64px rgba(37,99,235,0.06)' }} />
            </div>
          </div>

          <div className={`lp-feature-block lp-reveal lp-stagger-3 lp-feature-reverse`} ref={addRevealRef}>
            <div className="lp-feature-text">
              <span className="lp-feature-label">剧本写作引擎</span>
              <h3>标准格式输出，直接对接拍摄</h3>
              <p>遵循行业标准 YAML 剧本格式，自动生成场景描述、对白、动作指示、情绪标记，开箱即用。</p>
              <div className="lp-feature-scene-tag">Feature D &mdash; Writing</div>
            </div>
            <div className="lp-feature-img">
              <img src="/assets/script-editor.png" alt="YAML 剧本编辑器"
                style={{ width:'100%',height:'auto',display:'block',borderRadius:'4px',position:'relative',zIndex:3,boxShadow:'0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.08),0 24px 64px rgba(37,99,235,0.06)' }} />
            </div>
          </div>

          <div className={`lp-feature-block lp-reveal lp-stagger-4`} ref={addRevealRef}>
            <div className="lp-feature-text">
              <span className="lp-feature-label">审核校验引擎</span>
              <h3>多层审核，质量层层把关</h3>
              <p>自动检测逻辑漏洞、人物一致性、时间线冲突、情节断裂等问题，提供可执行的修改建议。</p>
              <div className="lp-feature-scene-tag">Feature E &mdash; Review</div>
            </div>
            <div className="lp-feature-img">
              <img src="/assets/audit-radar.png" alt="审核报告雷达图"
                style={{ maxHeight:'320px',width:'auto',display:'block',margin:'0 auto',borderRadius:'4px',position:'relative',zIndex:3,boxShadow:'0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06),0 12px 32px rgba(0,0,0,0.08),0 24px 64px rgba(37,99,235,0.06)' }} />
            </div>
          </div>
        </div>
      </section>

      {/* Gradient Divider Dark */}
      <div className="lp-gradient-divider-dark" />

      {/* Tech Highlights */}
      <section className="lp-tech-highlights">
        <div className="lp-container">
          <div className="lp-section-header" ref={addRevealRef}>
            <span className="lp-scene-tag">Scene 04 &mdash; Tech</span>
            <h2>技术驱动，品质保障</h2>
            <p>基于前沿 AI 技术栈构建，每一个环节都经过精心打磨</p>
          </div>
          <div className="lp-tech-grid">
            {[
              { icon: '🧠', title: 'LLM 深度理解', desc: '采用大语言模型进行深层语义理解，准确把握小说中的隐含信息、人物关系和情节脉络。' },
              { icon: '📊', title: '结构化 Pipeline', desc: '五阶段流水线架构，每个阶段独立运行、可单独重试，确保整体流程稳定可靠。' },
              { icon: '🔄', title: '自适应重试机制', desc: '智能识别失败环节，自动重试或降级处理，大幅提升任务成功率。' },
              { icon: '📝', title: '标准 YAML 输出', desc: '遵循行业标准的剧本数据格式，无缝对接下游制作工具链。' },
              { icon: '⚡', title: '流式实时反馈', desc: '处理过程实时推送进度，用户可随时了解当前状态和预计完成时间。' },
              { icon: '🛡️', title: '多维度质量门禁', desc: '内置多层质量检查机制，从格式规范到内容逻辑全面把关。' },
            ].map((item, i) => (
              <div key={i} className={`lp-tech-card lp-reveal lp-stagger-${i % 3 + 1}`} ref={addRevealRef}>
                <div className="lp-tech-icon">{item.icon}</div>
                <h4>{item.title}</h4>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="lp-audience">
        <div className="lp-container">
          <div className="lp-section-header" ref={addRevealRef}>
            <span className="lp-scene-tag">Scene 05 &mdash; Audience</span>
            <h2>为谁而建</h2>
            <p>无论你是创作者还是制片方，都能找到适合自己的工作方式</p>
          </div>
          <div className="lp-audience-grid">
            <div className={`lp-audience-card lp-reveal`} ref={addRevealRef}>
              <div className="lp-audience-badge">核心用户</div>
              <h4>网络小说作者</h4>
              <p>将自己的作品快速转化为可视化剧本，探索 IP 影视化的可能性，提升作品商业价值。</p>
              <div className="lp-audience-role">Author &mdash; Creator</div>
            </div>
            <div className={`lp-audience-card lp-reveal lp-stagger-1`} ref={addRevealRef}>
              <div className="lp-audience-badge">核心用户</div>
              <h4>编剧 / 编剧工作室</h4>
              <p>用 AI 加速初稿生成，将更多精力投入到创意打磨和艺术加工中，效率翻倍。</p>
              <div className="lp-audience-role">Screenwriter &mdash; Studio</div>
            </div>
            <div className={`lp-audience-card lp-reveal lp-stagger-2`} ref={addRevealRef}>
              <div className="lp-audience-badge">核心用户</div>
              <h4>影视制片方</h4>
              <p>快速评估小说 IP 的改编可行性，降低前期调研成本，加速项目立项决策。</p>
              <div className="lp-audience-role">Producer &mdash; Studio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="lp-footer-cta" id="cta">
        <div className="lp-footer-cta-bg" ref={particlesRef} />
        <h2 className={`lp-reveal`} ref={addRevealRef}>你的小说，下一部爆款网剧</h2>
        <p className={`lp-reveal lp-stagger-1`} ref={addRevealRef}>现在上传，见证文字如何变成画面</p>
        <button className={`lp-btn-glow lp-reveal lp-stagger-2`} ref={addRevealRef} onClick={onEnterApp}>
          立即免费体验
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </section>

      {/* Footer */}
      <footer className="lp-footer" id="about">
        <div className="lp-footer-grid">
          <div className="lp-footer-brand">
            <span className="lp-footer-logo">剧本人 AI</span>
            <p>让每一部小说，都值得被拍成网剧。AI 驱动的剧本创作引擎，为创作者与制片方搭建桥梁。</p>
          </div>
          <div className="lp-footer-col">
            <h5>产品</h5>
            <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('features') }}>功能介绍</a>
            <a href="#" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works') }}>使用教程</a>
            <a href="#">定价方案</a>
          </div>
          <div className="lp-footer-col">
            <h5>公司</h5>
            <a href="#">关于我们</a>
            <a href="#">联系方式</a>
            <a href="#">加入我们</a>
          </div>
          <div className="lp-footer-col">
            <h5>支持</h5>
            <a href="#">帮助中心</a>
            <a href="#">开发者文档</a>
            <a href="#">隐私政策</a>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <p>&copy; 2025 剧本人 AI. All rights reserved.</p>
          <span className="lp-footer-timecode">{timecode}</span>
        </div>
      </footer>

      {/* Back to Top */}
      <button ref={backToTopRef} className={`lp-back-to-top${backTopVisible ? ' visible' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        &#8593;
      </button>
    </div>
  )
}
