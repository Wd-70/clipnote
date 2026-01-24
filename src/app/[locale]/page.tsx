'use client';

import { motion } from 'motion/react';
import { 
  ArrowRight, 
  Scissors, 
  Sparkles, 
  Zap, 
  FileVideo, 
  CheckCircle2, 
  Play,
  Wand2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import Link from 'next/link';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 50 } },
};

const fadeInUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" as const },
  transition: { duration: 0.8, ease: "easeOut" as const }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Scissors size={18} />
            </div>
            ClipNote
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">기능</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">사용법</Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">요금제</Link>
          </nav>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="default" size="sm" className="hidden sm:flex" asChild>
              <Link href="/dashboard">시작하기</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 overflow-hidden">
          {/* Abstract Background */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-500/5 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto max-w-5xl text-center">
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="flex flex-col items-center gap-6"
            >
              <motion.div variants={item}>
                <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 mr-2 text-primary fill-primary/20" />
                  AI 기반 스마트 비디오 에디터
                </Badge>
              </motion.div>
              
              <motion.h1 variants={item} className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
                노트처럼 적으면,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                  영상이 됩니다
                </span>
              </motion.h1>
              
              <motion.p variants={item} className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                복잡한 타임라인 편집은 그만. 텍스트로 영상을 자르고 관리하세요.<br className="hidden md:block"/>
                ClipNote가 당신의 영상 작업을 10배 더 빠르게 만듭니다.
              </motion.p>

              <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 group" asChild>
                  <Link href="/dashboard">
                    무료로 시작하기 
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full" asChild>
                  <Link href="#how-it-works">
                    사용법 보기
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">왜 ClipNote인가요?</h2>
              <p className="text-lg text-muted-foreground">기존 편집 도구의 한계를 넘어선 새로운 경험</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Wand2,
                  title: "AI 자동 분석",
                  desc: "Gemini AI가 영상의 핵심 구간과 하이라이트를 자동으로 찾아냅니다."
                },
                {
                  icon: FileVideo,
                  title: "타임라인 노트",
                  desc: "타임라인을 드래그하는 대신 텍스트를 작성하여 정밀하게 구간을 설정하세요."
                },
                {
                  icon: Scissors,
                  title: "가상 편집",
                  desc: "원본 파일을 렌더링하지 않고 seekTo 기술로 즉시 미리보기가 가능합니다."
                },
                {
                  icon: Zap,
                  title: "스마트 내보내기",
                  desc: "필요한 부분만 FFmpeg로 고속 렌더링하여 클립으로 저장하세요."
                }
              ].map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  <Card className="h-full border-muted hover:border-primary/50 transition-colors bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                        <feature.icon size={24} />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.desc}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="py-24">
          <div className="container mx-auto px-4">
            <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">어떻게 작동하나요?</h2>
              <p className="text-lg text-muted-foreground">단 3단계로 끝나는 비디오 클리핑</p>
            </motion.div>

            <div className="relative max-w-4xl mx-auto">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-10 right-10 h-0.5 bg-gradient-to-r from-muted via-primary/30 to-muted z-0" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                {[
                  {
                    step: "01",
                    title: "영상 링크 입력",
                    desc: "YouTube나 스트리밍 다시보기 링크만 입력하세요. 다운로드는 필요 없습니다."
                  },
                  {
                    step: "02",
                    title: "AI 분석 및 노트",
                    desc: "AI가 분석한 내용을 바탕으로 필요한 구간을 텍스트로 선택하세요."
                  },
                  {
                    step: "03",
                    title: "클립 생성",
                    desc: "버튼 하나로 선택한 구간이 고화질 영상 파일로 저장됩니다."
                  }
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.2, duration: 0.5 }}
                    className="flex flex-col items-center text-center bg-background p-6 rounded-2xl border border-border shadow-sm"
                  >
                    <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-3xl font-bold text-primary mb-6 shadow-inner ring-8 ring-background">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
             <motion.div 
              initial={fadeInUp.initial}
              whileInView={fadeInUp.whileInView}
              viewport={fadeInUp.viewport}
              transition={fadeInUp.transition}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4">심플한 요금제</h2>
              <p className="text-lg text-muted-foreground">투명하고 합리적인 가격으로 시작하세요</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Tier */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card className="h-full border-muted p-6 flex flex-col">
                  <CardHeader className="p-0 mb-8">
                    <Badge variant="outline" className="w-fit mb-4">Starter</Badge>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">Free</span>
                      <span className="text-muted-foreground">/ forever</span>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      가볍게 시작하는 크리에이터를 위한 플랜
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>월 60분 무료 분석</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>기본 화질 (720p) 내보내기</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
                        <span>최대 5개 프로젝트</span>
                      </li>
                    </ul>
                    <Button variant="outline" className="w-full h-12 text-lg" asChild>
                      <Link href="/dashboard">무료로 시작하기</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Pro Tier */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-b from-primary to-blue-600 opacity-20 blur-sm -z-10" />
                <Card className="h-full border-primary/20 p-6 flex flex-col bg-card/80 backdrop-blur-sm">
                  <CardHeader className="p-0 mb-8">
                    <Badge className="w-fit mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-0">Pro</Badge>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">₩9,900</span>
                      <span className="text-muted-foreground">/ 월</span>
                    </div>
                    <CardDescription className="mt-2 text-base">
                      전문적인 작업을 위한 모든 기능
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1">
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span className="font-medium">무제한 분석</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>4K 고화질 내보내기</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>우선 처리 시스템</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        <span>무제한 프로젝트 저장</span>
                      </li>
                    </ul>
                    <Button className="w-full h-12 text-lg shadow-lg shadow-primary/20" asChild>
                      <Link href="/dashboard">Pro 시작하기</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 px-4 relative overflow-hidden">
           <div className="absolute inset-0 bg-primary/5 -z-10" />
           <div className="container mx-auto text-center max-w-3xl">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                  지금 바로 영상을 <br className="hidden sm:block"/>
                  나만의 노트로 만들어보세요
                </h2>
                <p className="text-xl text-muted-foreground mb-10">
                  신규 가입 시 60분 무료 분석 포인트가 제공됩니다.
                </p>
                <Button size="lg" className="h-14 px-10 text-lg rounded-full" asChild>
                  <Link href="/dashboard">
                    ClipNote 시작하기
                  </Link>
                </Button>
              </motion.div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-bold text-foreground">
             <Scissors size={16} />
             ClipNote
          </div>
          <p>© 2026 ClipNote. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground">Terms</Link>
            <Link href="#" className="hover:text-foreground">Privacy</Link>
            <Link href="#" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
